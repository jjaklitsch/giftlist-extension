import axios from "axios";
import { getToken, getUser } from "../firebaseHelper";

export const instance = axios.create({
  baseURL: `https://admin.giftlist.com/api`,
  withCredentials: false,
  headers: {
    Accept: "application/json",
    'Content-Type': "application/json",
    'Access-Control-Allow-Origin': "*",
  },
});

instance.interceptors.request.use(
  async (config) => {
    let token = getToken();
    if (token) {
      if (token instanceof Promise) token = await token;
      if (token) config.headers["x-access-token"] = token;
    }

    return config;
  },
  (err) => Promise.reject(err)
);

instance.interceptors.response.use(async (response) => {
  return response.data;
}, (error) => {
  const status = error.response ? error.response.status : null;
  const user = getUser();
  if (status === 401 && !error.config._retr && user) {
    return user.getIdToken(true)
      .then(token => instance({
        ...error.config,
        headers: {
          Accept: "application/json",
          'Content-Type': "application/json",
          'Access-Control-Allow-Origin': "*",
          'x-access-token': token,
        },
      }));
  }

  return Promise.reject(error);
});

export const legacyLogin = async (email, password) => {
  try {
    return await instance.post('api/user/signin', { email, password });
  } catch (error) {
    console.error('Legacy login error:', error);
    throw error;  // Re-throw for client-side error handling
  }
};
