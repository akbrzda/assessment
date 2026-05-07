<template>
  <div class="certificates-page">
    <div class="certificates-header">
      <h1 class="certificates-title">Мои сертификаты</h1>
      <p class="certificates-subtitle">Подтверждение пройденных курсов</p>
    </div>

    <div v-if="isLoading" class="certificates-skeleton">
      <SkeletonCard />
      <SkeletonList :items="3" />
    </div>

    <div v-else-if="errorMessage" class="certificates-error app-panel">
      <p class="error-title">Не удалось загрузить сертификаты</p>
      <p class="error-text">{{ errorMessage }}</p>
      <button class="retry-btn" type="button" @click="loadCertificates">Повторить</button>
    </div>

    <div v-else-if="certificates.length" class="cert-list">
      <article v-for="cert in certificates" :key="cert.uuid" class="cert-card app-panel">
        <div class="cert-card__top">
          <span class="cert-icon"><Trophy :size="16" /></span>
          <div class="cert-card__info">
            <h2 class="cert-card__title">{{ cert.course_title }}</h2>
            <p class="cert-card__date">{{ formatDate(cert.issued_at) }}</p>
            <p v-if="(cert.display_status || cert.status) === 'expired'" class="cert-card__expired">
              Просрочен {{ formatDate(cert.expires_at) }}
            </p>
          </div>
        </div>
        <div v-if="cert.score_percent != null" class="cert-card__score">
          Результат: <strong>{{ Number(cert.score_percent).toFixed(0) }}%</strong>
        </div>
        <button
          class="cert-download-btn"
          type="button"
          :disabled="downloading[cert.uuid] || (cert.display_status || cert.status) === 'expired'"
          @click="openPreview(cert)"
        >
          {{ (cert.display_status || cert.status) === "expired" ? "Скачивание недоступно" : downloading[cert.uuid] ? "Загрузка..." : "Предпросмотр и скачать PNG" }}
        </button>
      </article>
    </div>

    <div v-else class="certificates-empty app-panel">
      <p class="empty-title">Пока нет выданных сертификатов</p>
      <p class="empty-subtitle">Завершите курс и сдайте итоговую аттестацию, чтобы получить сертификат</p>
    </div>

    <div v-if="previewVisible" class="preview-overlay" @click.self="closePreview">
      <div class="preview-modal app-panel">
        <div class="preview-header">
          <div class="preview-title-wrap">
            <h2 class="preview-title">{{ previewCertificate?.course_title || "Сертификат" }}</h2>
            <p class="preview-subtitle">Предпросмотр PNG</p>
          </div>
          <button class="preview-close-btn" type="button" @click="closePreview">Закрыть</button>
        </div>

        <div class="preview-body">
          <div v-if="previewLoading" class="preview-loading">Загружаем файл...</div>
          <div v-else-if="previewError" class="preview-error">{{ previewError }}</div>
          <iframe v-else-if="previewFrameSrc" class="preview-frame" :src="previewFrameSrc" title="Предпросмотр сертификата" />
        </div>

        <div class="preview-footer">
          <button class="preview-download-btn" type="button" :disabled="!previewBlob" @click="downloadCurrentPdf">Скачать файл</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, reactive, ref } from "vue";
import { Trophy as Trophy } from "lucide-vue-next";
import { apiClient } from "../services/apiClient";
import SkeletonCard from "../components/skeleton/SkeletonCard.vue";
import SkeletonList from "../components/skeleton/SkeletonList.vue";

export default {
  name: "CertificatesView",
  components: { SkeletonCard, SkeletonList },
  setup() {
    const certificates = ref([]);
    const isLoading = ref(false);
    const errorMessage = ref("");
    const downloading = reactive({});
    const previewVisible = ref(false);
    const previewLoading = ref(false);
    const previewError = ref("");
    const previewCertificate = ref(null);
    const previewBlob = ref(null);
    const previewUrl = ref("");
    const previewFrameSrc = ref("");

    function formatDate(isoString) {
      if (!isoString) return "";
      return new Date(isoString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    async function loadCertificates() {
      isLoading.value = true;
      errorMessage.value = "";
      try {
        const data = await apiClient.getMyCertificates();
        certificates.value = data.items || [];
      } catch (err) {
        console.error("[CertificatesView] ошибка загрузки:", err);
        errorMessage.value = err.message || "Ошибка загрузки";
      } finally {
        isLoading.value = false;
      }
    }

    function cleanupPreviewUrl() {
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = "";
      }
      previewFrameSrc.value = "";
    }

    function closePreview() {
      previewVisible.value = false;
      previewLoading.value = false;
      previewError.value = "";
      previewCertificate.value = null;
      previewBlob.value = null;
      cleanupPreviewUrl();
    }

    async function openPreview(cert) {
      downloading[cert.uuid] = true;
      previewVisible.value = true;
      previewLoading.value = true;
      previewError.value = "";
      previewCertificate.value = cert;
      previewBlob.value = null;
      cleanupPreviewUrl();

      try {
        const blob = await apiClient.downloadCertificate(cert.uuid);
        previewBlob.value = blob;
        previewUrl.value = URL.createObjectURL(blob);
        previewFrameSrc.value = `${previewUrl.value}#page=1&zoom=page-fit&toolbar=0&navpanes=0`;
      } catch (err) {
        console.error("[CertificatesView] ошибка загрузки PNG:", err);
        previewError.value = err.message || "Не удалось загрузить сертификат";
      } finally {
        previewLoading.value = false;
        downloading[cert.uuid] = false;
      }
    }

    function downloadCurrentPdf() {
      if (!previewBlob.value || !previewCertificate.value) return;

      const url = URL.createObjectURL(previewBlob.value);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${previewCertificate.value.uuid}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    onMounted(loadCertificates);
    onBeforeUnmount(() => {
      cleanupPreviewUrl();
    });

    return {
      certificates,
      isLoading,
      errorMessage,
      downloading,
      formatDate,
      loadCertificates,
      openPreview,
      closePreview,
      previewVisible,
      previewLoading,
      previewError,
      previewUrl,
      previewFrameSrc,
      previewBlob,
      previewCertificate,
      downloadCurrentPdf,
    };
  },
};
</script>

<style scoped>
.certificates-page {
  padding: 16px;
  padding-bottom: 80px;
}

.certificates-header {
  margin-bottom: 20px;
}

.certificates-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}

.certificates-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary, #888);
  margin: 0;
}

.cert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cert-card {
  padding: 16px;
}

.cert-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.cert-icon {
  font-size: 28px;
  line-height: 1;
}

.cert-card__info {
  flex: 1;
}

.cert-card__title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
  line-height: 1.3;
}

.cert-card__date {
  font-size: 13px;
  color: var(--color-text-secondary, #888);
  margin: 0;
}

.cert-card__expired {
  font-size: 12px;
  color: #b45309;
  margin: 4px 0 0;
}

.cert-card__score {
  font-size: 13px;
  color: var(--color-text-secondary, #888);
  margin-bottom: 12px;
}

.cert-download-btn {
  width: 100%;
  padding: 10px 16px;
  background: var(--color-primary, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.cert-download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.certificates-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.certificates-error,
.certificates-empty {
  padding: 20px;
  text-align: center;
}

.error-title,
.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
}

.error-text,
.empty-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary, #888);
  margin: 0 0 16px;
}

.retry-btn {
  padding: 8px 20px;
  background: var(--color-primary, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.62);
  z-index: 1300;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
}

.preview-modal {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: clip;
}

.preview-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--divider, #e5e7eb);
}

.preview-title-wrap {
  min-width: 0;
}

.preview-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary, #888);
}

.preview-close-btn {
  padding: 8px 10px;
  border: 1px solid var(--divider, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.preview-body {
  flex: 1;
  min-height: 0;
  background: #f8fafc;
  overflow: hidden;
}

.preview-frame {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: none;
  background: #fff;
}

.preview-loading,
.preview-error {
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary, #666);
}

.preview-footer {
  border-top: 1px solid var(--divider, #e5e7eb);
  padding: 12px 14px;
  display: flex;
  justify-content: flex-end;
}

.preview-download-btn {
  padding: 10px 14px;
  background: var(--color-primary, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.preview-download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
