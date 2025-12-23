import { ref, computed } from "vue";
import { useCachedFetch, invalidateCache } from "./useCache";
import apiClient from "../utils/axios";

const referencesData = ref(null);
const referencesLoading = ref(false);
const referencesError = ref(null);

/**
 * Композабл для работы со справочниками
 */
export function useReferences() {
  const fetchReferences = async () => {
    referencesLoading.value = true;
    referencesError.value = null;

    try {
      const { data } = await apiClient.get("/admin/references");
      referencesData.value = data;
      return data;
    } catch (error) {
      referencesError.value = error;
      throw error;
    } finally {
      referencesLoading.value = false;
    }
  };

  const loadReferences = async (forceRefresh = false) => {
    if (!forceRefresh && referencesData.value) {
      return referencesData.value;
    }
    return fetchReferences();
  };

  const invalidateReferences = () => {
    referencesData.value = null;
    invalidateCache(/references/);
  };

  const branches = computed(() => referencesData.value?.branches || []);
  const positions = computed(() => referencesData.value?.positions || []);
  const roles = computed(() => referencesData.value?.roles || []);

  return {
    references: referencesData,
    branches,
    positions,
    roles,
    loading: referencesLoading,
    error: referencesError,
    loadReferences,
    invalidateReferences,
  };
}
