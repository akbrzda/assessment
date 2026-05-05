<template>
  <div class="certificates-view">
    <PageHeader title="Сертификаты" subtitle="Выданные сертификаты о прохождении курсов">
      <template #actions>
        <Button icon="plus" size="md" @click="openIssueModal">Выдать вручную</Button>
      </template>
    </PageHeader>

    <!-- Фильтры -->
    <div class="filters-row mb-4 flex flex-wrap gap-3">
      <input v-model="filters.search" class="filter-input" type="text" placeholder="ID пользователя или курса..." @keyup.enter="loadCertificates" />
      <select v-model="filters.status" class="filter-select" @change="loadCertificates">
        <option value="">Все статусы</option>
        <option value="issued">Выдан</option>
        <option value="pending">Генерируется</option>
        <option value="generation_failed">Ошибка</option>
        <option value="revoked">Аннулирован</option>
      </select>
      <Button size="sm" variant="secondary" @click="loadCertificates">Применить</Button>
    </div>

    <!-- Загрузка -->
    <SkeletonTable v-if="isLoading" :rows="10" :cols="5" />

    <!-- Ошибка -->
    <Alert v-else-if="errorMessage" variant="error" :message="errorMessage" class="mb-4" />

    <!-- Пустое состояние -->
    <EmptyState
      v-else-if="!certificates.length"
      title="Сертификаты не найдены"
      description="Попробуйте изменить фильтры или выдайте первый сертификат вручную."
    />

    <!-- Таблица -->
    <div v-else>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Пользователь</TableHeader>
            <TableHeader>Курс</TableHeader>
            <TableHeader>Статус</TableHeader>
            <TableHeader>Результат</TableHeader>
            <TableHeader>Дата</TableHeader>
            <TableHeader>Действия</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow v-for="cert in certificates" :key="cert.id">
            <TableCell>{{ cert.first_name }} {{ cert.last_name }}</TableCell>
            <TableCell>{{ cert.course_title }}</TableCell>
            <TableCell>
              <Badge :variant="statusVariant(cert.status)">{{ statusLabel(cert.status) }}</Badge>
            </TableCell>
            <TableCell>
              {{ cert.score_percent != null ? Number(cert.score_percent).toFixed(0) + "%" : "—" }}
            </TableCell>
            <TableCell>{{ formatDate(cert.issued_at) }}</TableCell>
            <TableCell>
              <div class="actions-cell">
                <Button v-if="cert.status === 'issued'" size="xs" variant="secondary" @click="handleDownload(cert)">Скачать</Button>
                <Button v-if="cert.status === 'issued'" size="xs" variant="danger" @click="confirmRevoke(cert)">Аннулировать</Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Пагинация -->
      <div class="pagination-row mt-4 flex items-center gap-3">
        <Button size="sm" variant="secondary" :disabled="pagination.page <= 1" @click="prevPage">←</Button>
        <span class="text-sm text-gray-600">Стр. {{ pagination.page }} / {{ totalPages }}</span>
        <Button size="sm" variant="secondary" :disabled="pagination.page >= totalPages" @click="nextPage">→</Button>
      </div>
    </div>

    <!-- Модальное окно выдачи -->
    <Modal :show="showIssueModal" title="Выдать сертификат" @close="closeModals">
      <div class="modal-form">
        <label class="modal-label">ID пользователя</label>
        <input v-model="issueForm.userId" class="filter-input w-full mb-3" type="number" placeholder="Введите ID пользователя" />
        <label class="modal-label">ID курса</label>
        <input v-model="issueForm.courseId" class="filter-input w-full mb-4" type="number" placeholder="Введите ID курса" />
        <Alert v-if="issueError" variant="error" :message="issueError" class="mb-3" />
        <div class="flex gap-3">
          <Button :disabled="isIssuing" @click="handleIssue">{{ isIssuing ? "Выдача..." : "Выдать" }}</Button>
          <Button variant="secondary" @click="closeModals">Отмена</Button>
        </div>
      </div>
    </Modal>

    <!-- Подтверждение аннулирования -->
    <ConfirmDialog
      :show="showRevokeDialog"
      title="Аннулировать сертификат?"
      :message="`Сертификат пользователя ${revokeTarget?.first_name} ${revokeTarget?.last_name} по курсу «${revokeTarget?.course_title}» будет аннулирован. Это действие необратимо.`"
      confirm-label="Аннулировать"
      confirm-variant="danger"
      @confirm="handleRevoke"
      @cancel="showRevokeDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import Alert from "@/components/ui/Alert.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import Modal from "@/components/ui/Modal.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui";
import { getCertificates, revokeCertificate, issueCertificate, downloadCertificate } from "@/api/certificates";

const certificates = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const total = ref(0);
const pagination = ref({ page: 1, limit: 20 });

const filters = ref({ status: "", search: "" });

const showIssueModal = ref(false);
const showRevokeDialog = ref(false);
const revokeTarget = ref(null);
const isIssuing = ref(false);
const issueError = ref("");
const issueForm = ref({ userId: "", courseId: "" });

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pagination.value.limit)));

async function loadCertificates() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    if (filters.value.status) params.status = filters.value.status;
    const result = await getCertificates(params);
    certificates.value = result.items || [];
    total.value = result.total || 0;
  } catch (err) {
    console.error("[CertificatesView] ошибка загрузки:", err);
    errorMessage.value = err.message || "Ошибка загрузки";
  } finally {
    isLoading.value = false;
  }
}

function prevPage() {
  if (pagination.value.page > 1) {
    pagination.value.page--;
    loadCertificates();
  }
}

function nextPage() {
  if (pagination.value.page < totalPages.value) {
    pagination.value.page++;
    loadCertificates();
  }
}

function openIssueModal() {
  issueForm.value = { userId: "", courseId: "" };
  issueError.value = "";
  showIssueModal.value = true;
}

function closeModals() {
  showIssueModal.value = false;
  showRevokeDialog.value = false;
  revokeTarget.value = null;
}

function confirmRevoke(cert) {
  revokeTarget.value = cert;
  showRevokeDialog.value = true;
}

async function handleRevoke() {
  if (!revokeTarget.value) return;
  try {
    await revokeCertificate(revokeTarget.value.id);
    showRevokeDialog.value = false;
    revokeTarget.value = null;
    await loadCertificates();
  } catch (err) {
    console.error("[CertificatesView] ошибка аннулирования:", err);
  }
}

async function handleIssue() {
  issueError.value = "";
  const userId = Number(issueForm.value.userId);
  const courseId = Number(issueForm.value.courseId);
  if (!userId || !courseId) {
    issueError.value = "Введите корректные ID пользователя и курса";
    return;
  }
  isIssuing.value = true;
  try {
    await issueCertificate({ userId, courseId });
    closeModals();
    await loadCertificates();
  } catch (err) {
    issueError.value = err.message || "Не удалось выдать сертификат";
  } finally {
    isIssuing.value = false;
  }
}

async function handleDownload(cert) {
  try {
    const blob = await downloadCertificate(cert.uuid);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${cert.uuid}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[CertificatesView] ошибка скачивания:", err);
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

function statusLabel(status) {
  const map = { issued: "Выдан", pending: "Генерируется", generation_failed: "Ошибка", revoked: "Аннулирован" };
  return map[status] || status;
}

function statusVariant(status) {
  const map = { issued: "success", pending: "default", generation_failed: "error", revoked: "warning" };
  return map[status] || "default";
}

onMounted(loadCertificates);
</script>

<style scoped>
.certificates-view {
  padding: 0 4px;
}

.filters-row {
  align-items: center;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  min-width: 200px;
}

.filter-input:focus {
  border-color: #4f46e5;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  outline: none;
  cursor: pointer;
}

.actions-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pagination-row {
  justify-content: center;
}

.modal-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.modal-form {
  padding: 4px 0;
}
</style>
