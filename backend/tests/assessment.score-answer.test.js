const test = require('node:test');
const assert = require('node:assert/strict');

const { __test } = require('../src/models/assessmentModel');

const { scoreAnswer } = __test;

test('scoreAnswer: single определяет правильный вариант', () => {
  const result = scoreAnswer(
    {
      questionType: 'single',
      options: [
        { id: 10, isCorrect: false },
        { id: 11, isCorrect: true },
      ],
    },
    { optionId: 11 }
  );

  assert.equal(result.isCorrect, 1);
  assert.equal(result.resolvedOptionId, 11);
});

test('scoreAnswer: multiple сравнивает набор вариантов без учета порядка', () => {
  const result = scoreAnswer(
    {
      questionType: 'multiple',
      options: [
        { id: 1, isCorrect: true },
        { id: 2, isCorrect: false },
        { id: 3, isCorrect: true },
      ],
    },
    { optionIds: [3, 1] }
  );

  assert.equal(result.isCorrect, 1);
  assert.equal(result.selectedOptionIdsJson, JSON.stringify([1, 3]));
});

test('scoreAnswer: matching оценивает по парам', () => {
  const result = scoreAnswer(
    {
      questionType: 'matching',
      options: [
        { id: 101, isCorrect: false },
        { id: 102, isCorrect: false },
      ],
    },
    {
      matchPairs: [
        { leftOptionId: 101, rightOptionId: 101 },
        { leftOptionId: 102, rightOptionId: 102 },
      ],
    }
  );

  assert.equal(result.isCorrect, 1);
});

test('scoreAnswer: text учитывает нормализацию пробелов и регистра', () => {
  const result = scoreAnswer(
    {
      questionType: 'text',
      correctTextAnswer: 'Панда Пицца',
      options: [],
    },
    {
      textAnswer: '  панда   пицца  ',
    }
  );

  assert.equal(result.isCorrect, 1);
});

test('scoreAnswer: text поддерживает синонимы через |', () => {
  const result = scoreAnswer(
    {
      questionType: 'text',
      correctTextAnswer: 'кофе|капучино|латте',
      options: [],
    },
    {
      textAnswer: 'Капучино',
    }
  );

  assert.equal(result.isCorrect, 1);
});

test('scoreAnswer: text поддерживает ключевые слова через + и ,', () => {
  const result = scoreAnswer(
    {
      questionType: 'text',
      correctTextAnswer: 'клиент+сервис,улыбка',
      options: [],
    },
    {
      textAnswer: 'Сервис для клиент важен: улыбка и скорость',
    }
  );

  assert.equal(result.isCorrect, 1);
});
