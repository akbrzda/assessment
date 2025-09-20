<template>
  <PageContainer title="Раздел в разработке" subtitle="Скоро здесь появятся функции">
    <InfoCard>
      <p class="text">
        Мы работаем над разделом. После запуска вы сможете управлять аттестациями, просматривать списки тестов и рейтинги.
      </p>
    </InfoCard>
  </PageContainer>
</template>

<script setup>
import PageContainer from '../components/PageContainer.vue';
import InfoCard from '../components/InfoCard.vue';
</script>

<style scoped>
.text {
  margin: 0;
  font-size: 14px;
  color: var(--tg-theme-text-color, #0a0a0a);
}
</style>
