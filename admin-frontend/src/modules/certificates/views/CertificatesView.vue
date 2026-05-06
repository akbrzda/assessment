<template>
  <div class="certificates-view">
    <PageHeader title="Сертификаты" subtitle="Выданные сертификаты о прохождении курсов">
      <template #actions>
        <Button icon="plus" size="md" @click="openIssueModal">Выдать вручную</Button>
      </template>
    </PageHeader>

    <!-- Фильтры -->
    <FilterBar
      v-model="filters"
      search-key="search"
      search-placeholder="Поиск по имени или курсу..."
      :filter-defs="filterDefs"
      class="mb-4"
      @change="onFilterChange"
    />

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
        <TableHeader>
          <TableRow>
            <TableHead>Пользователь</TableHead>
            <TableHead>Курс</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Результат</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
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
                <Button v-if="cert.status === 'issued'" size="sm" variant="secondary" @click="handleDownload(cert)">Скачать</Button>
                <Button v-if="cert.status === 'issued'" size="sm" variant="danger" @click="confirmRevoke(cert)">Аннулировать</Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Пагинация -->
      <Pagination
        :total="total"
        :page="pagination.page"
        :limit="pagination.limit"
        @update:page="
          pagination.page = $event;
          loadCertificates();
        "
        @update:limit="
          pagination.limit = $event;
          pagination.page = 1;
          loadCertificates();
        "
      />
    </div>

    <!-- Модальное окно выдачи -->
    <Modal :show="showIssueModal" title="Выдать сертификат" @close="closeModals">
      <div class="flex flex-col gap-3">
        <Input v-model="issueForm.userId" label="ID пользователя" type="number" placeholder="Введите ID пользователя" />
        <Input v-model="issueForm.courseId" label="ID курса" type="number" placeholder="Введите ID курса" />
        <Alert v-if="issueError" variant="error" :message="issueError" />
        <div class="flex gap-3 pt-1">
          <Button :loading="isIssuing" @click="handleIssue">Выдать</Button>
          <Button variant="secondary" @click="closeModals">Отмена</Button>
        </div>
      </div>
    </Modal>

    <!-- Подтверждение аннулирования -->
    <ConfirmDialog
      v-model="showRevokeDialog"
      title="Аннулировать сертификат?"
      :message="`Сертификат пользователя ${revokeTarget?.first_name || '—'} ${revokeTarget?.last_name || ''} по курсу «${revokeTarget?.course_title || '—'}» будет аннулирован. Это действие необратимо.`"
      confirm-text="Аннулировать"
      variant="danger"
      @confirm="handleRevoke"
      @cancel="showRevokeDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import Alert from "@/components/ui/Alert.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import Modal from "@/components/ui/Modal.vue";
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
import Input from "@/components/ui/Input.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import Pagination from "@/components/ui/Pagination.vue";
import { useToast } from "@/composables/useToast";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui";
import { getCertificates, revokeCertificate, issueCertificate, downloadCertificate } from "@/api/certificates";

const { showToast } = useToast();
const certificates = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const total = ref(0);
const pagination = ref({ page: 1, limit: 20 });

const filters = ref({ status: "", search: "" });

const filterDefs = [
  {
    key: "status",
    label: "Статус",
    placeholder: "Все статусы",
    options: [
      { value: "issued", label: "Выдан" },
      { value: "pending", label: "Генерируется" },
      { value: "generation_failed", label: "Ошибка" },
      { value: "revoked", label: "Аннулирован" },
    ],
  },
];

function onFilterChange() {
  pagination.value.page = 1;
  loadCertificates();
}

const showIssueModal = ref(false);
const showRevokeDialog = ref(false);
const revokeTarget = ref(null);
const isIssuing = ref(false);
const issueError = ref("");
const issueForm = ref({ userId: "", courseId: "" });

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
    errorMessage.value = err?.response?.data?.error || err.message || "Ошибка загрузки";
  } finally {
    isLoading.value = false;
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
    showToast("Сертификат аннулирован", "success");
  } catch (err) {
    console.error("[CertificatesView] ошибка аннулирования:", err);
    showToast(err?.response?.data?.error || "Не удалось аннулировать сертификат", "error");
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
    showToast("Сертификат выдан", "success");
  } catch (err) {
    issueError.value = err?.response?.data?.error || err.message || "Не удалось выдать сертификат";
    showToast(issueError.value, "error");
    // Перезагружаем список — сертификат мог быть создан в статусе generation_failed
    await loadCertificates();
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
    a.download = `certificate-${cert.uuid}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[CertificatesView] ошибка скачивания:", err);
    showToast(err?.response?.data?.error || "Не удалось скачать сертификат", "error");
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
