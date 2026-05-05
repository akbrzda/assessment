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
          <span class="cert-icon">🏆</span>
          <div class="cert-card__info">
            <h2 class="cert-card__title">{{ cert.course_title }}</h2>
            <p class="cert-card__date">{{ formatDate(cert.issued_at) }}</p>
          </div>
        </div>
        <div v-if="cert.score_percent != null" class="cert-card__score">
          Результат: <strong>{{ Number(cert.score_percent).toFixed(0) }}%</strong>
        </div>
        <button class="cert-download-btn" type="button" :disabled="downloading[cert.uuid]" @click="handleDownload(cert)">
          {{ downloading[cert.uuid] ? "Загрузка..." : "Скачать PDF" }}
        </button>
      </article>
    </div>

    <div v-else class="certificates-empty app-panel">
      <p class="empty-title">Пока нет выданных сертификатов</p>
      <p class="empty-subtitle">Завершите курс и сдайте итоговую аттестацию, чтобы получить сертификат</p>
    </div>
  </div>
</template>

<script>
import { onMounted, reactive, ref } from "vue";
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

    async function handleDownload(cert) {
      downloading[cert.uuid] = true;
      try {
        const blob = await apiClient.downloadCertificate(cert.uuid);
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
        alert("Не удалось скачать сертификат. Попробуйте позже.");
      } finally {
        downloading[cert.uuid] = false;
      }
    }

    onMounted(loadCertificates);

    return { certificates, isLoading, errorMessage, downloading, formatDate, loadCertificates, handleDownload };
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
</style>
