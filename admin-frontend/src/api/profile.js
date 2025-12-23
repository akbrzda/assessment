import axiosInstance from "../utils/axios";

const profileApi = {
  // Получить профиль текущего пользователя
  getProfile() {
    return axiosInstance.get("/admin/profile");
  },

  // Обновить профиль текущего пользователя
  updateProfile(data) {
    return axiosInstance.put("/admin/profile", data);
  },
};

export default profileApi;
