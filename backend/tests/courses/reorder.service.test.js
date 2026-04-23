const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../../src/config/database");
const coursesRepo = require("../../src/modules/courses/courses.repository");
const mutationsRepo = require("../../src/modules/courses/coursesMutations.repository");
const contentService = require("../../src/modules/courses/admin/contentService");
const auditService = require("../../src/services/auditService");

function createConnectionStub() {
  return {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  };
}

function createRequestStub(userId) {
  return {
    user: { id: userId },
    headers: {},
    socket: {},
  };
}

function withPatchedDependencies() {
  const originalPoolGetConnection = pool.getConnection;
  const originalFindById = coursesRepo.findById;
  const originalFindSectionById = coursesRepo.findSectionById;
  const originalListSectionsByCourseId = coursesRepo.listSectionsByCourseId;
  const originalListTopicsBySectionId = coursesRepo.listTopicsBySectionId;
  const originalGetCourseByIdForAdmin = coursesRepo.getCourseByIdForAdmin;
  const originalReorderSections = mutationsRepo.reorderSections;
  const originalReorderTopics = mutationsRepo.reorderTopics;
  const originalTouchCourse = mutationsRepo.touchCourse;
  const originalLogAndSend = auditService.logAndSend;

  pool.getConnection = async () => createConnectionStub();
  auditService.logAndSend = async () => {};

  return () => {
    pool.getConnection = originalPoolGetConnection;
    coursesRepo.findById = originalFindById;
    coursesRepo.findSectionById = originalFindSectionById;
    coursesRepo.listSectionsByCourseId = originalListSectionsByCourseId;
    coursesRepo.listTopicsBySectionId = originalListTopicsBySectionId;
    coursesRepo.getCourseByIdForAdmin = originalGetCourseByIdForAdmin;
    mutationsRepo.reorderSections = originalReorderSections;
    mutationsRepo.reorderTopics = originalReorderTopics;
    mutationsRepo.touchCourse = originalTouchCourse;
    auditService.logAndSend = originalLogAndSend;
  };
}

test("reorderSections: сохраняет порядок тем курса", async () => {
  const restore = withPatchedDependencies();
  const reorderedPayloads = [];
  const touchedPayloads = [];
  try {
    coursesRepo.findById = async () => ({ id: 15, status: "draft" });
    coursesRepo.listSectionsByCourseId = async () => [{ id: 1 }, { id: 2 }, { id: 3 }];
    coursesRepo.getCourseByIdForAdmin = async () => ({ id: 15, sections: [{ id: 2 }, { id: 1 }, { id: 3 }] });
    mutationsRepo.reorderSections = async (courseId, sectionIds) => {
      reorderedPayloads.push({ courseId, sectionIds });
    };
    mutationsRepo.touchCourse = async (courseId, userId, shouldRevalidatePublished) => {
      touchedPayloads.push({ courseId, userId, shouldRevalidatePublished });
    };

    const result = await contentService.reorderSections(15, [2, 1, 3], 77, createRequestStub(77));
    assert.equal(result.course.id, 15);
    assert.deepEqual(reorderedPayloads, [{ courseId: 15, sectionIds: [2, 1, 3] }]);
    assert.deepEqual(touchedPayloads, [{ courseId: 15, userId: 77, shouldRevalidatePublished: false }]);
  } finally {
    restore();
  }
});

test("reorderSections: отклоняет редактирование опубликованного курса", async () => {
  const restore = withPatchedDependencies();
  try {
    coursesRepo.findById = async () => ({ id: 15, status: "published" });
    coursesRepo.listSectionsByCourseId = async () => [{ id: 1 }, { id: 2 }];

    await assert.rejects(
      () => contentService.reorderSections(15, [2, 1], 77, createRequestStub(77)),
      (error) => error && error.status === 409 && /черновик изменений/i.test(error.message),
    );
  } finally {
    restore();
  }
});

test("reorderSections: отклоняет запрос при несовпадающем составе тем", async () => {
  const restore = withPatchedDependencies();
  try {
    coursesRepo.findById = async () => ({ id: 20, status: "draft" });
    coursesRepo.listSectionsByCourseId = async () => [{ id: 10 }, { id: 11 }];
    mutationsRepo.reorderSections = async () => {
      throw new Error("Не должно вызываться при невалидном составе");
    };

    await assert.rejects(
      () => contentService.reorderSections(20, [10, 99], 1, createRequestStub(1)),
      (error) => error && error.status === 422 && /состав тем курса/i.test(error.message),
    );
  } finally {
    restore();
  }
});

test("reorderTopics: сохраняет порядок подтем в теме курса", async () => {
  const restore = withPatchedDependencies();
  const reorderedPayloads = [];
  const touchedPayloads = [];
  try {
    coursesRepo.findSectionById = async () => ({ id: 5, courseId: 42, courseStatus: "draft" });
    coursesRepo.listTopicsBySectionId = async () => [{ id: 201 }, { id: 202 }];
    coursesRepo.getCourseByIdForAdmin = async () => ({ id: 42, sections: [{ id: 5, topics: [{ id: 202 }, { id: 201 }] }] });
    mutationsRepo.reorderTopics = async (sectionId, topicIds) => {
      reorderedPayloads.push({ sectionId, topicIds });
    };
    mutationsRepo.touchCourse = async (courseId, userId, shouldRevalidatePublished) => {
      touchedPayloads.push({ courseId, userId, shouldRevalidatePublished });
    };

    const result = await contentService.reorderTopics(42, 5, [202, 201], 13, createRequestStub(13));
    assert.equal(result.course.id, 42);
    assert.deepEqual(reorderedPayloads, [{ sectionId: 5, topicIds: [202, 201] }]);
    assert.deepEqual(touchedPayloads, [{ courseId: 42, userId: 13, shouldRevalidatePublished: false }]);
  } finally {
    restore();
  }
});

test("reorderTopics: отклоняет запрос, если тема не относится к курсу", async () => {
  const restore = withPatchedDependencies();
  try {
    coursesRepo.findSectionById = async () => ({ id: 8, courseId: 999, courseStatus: "published" });

    await assert.rejects(
      () => contentService.reorderTopics(42, 8, [1, 2], 5, createRequestStub(5)),
      (error) => error && error.status === 404 && /тема курса не найдена/i.test(error.message),
    );
  } finally {
    restore();
  }
});
