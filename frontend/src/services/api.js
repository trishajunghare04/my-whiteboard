const BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("wb_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: getHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (res.status === 401) {
    localStorage.removeItem("wb_token");
    localStorage.removeItem("wb_user");
    window.location.href = "/login";
    return;
  }
  return res.json();
};

export const api = {
  // Auth
  register: (data) => req("POST", "/auth/register", data),
  login: (data) => req("POST", "/auth/login", data),
  me: () => req("GET", "/auth/me"),
  updateProfile: (data) => req("PUT", "/auth/profile", data),

  // Boards
  getBoards: () => req("GET", "/boards"),
  getBoard: (id) => req("GET", `/boards/${id}`),
  createBoard: (data) => req("POST", "/boards", data),
  updateBoard: (id, data) => req("PUT", `/boards/${id}`, data),
  saveCanvas: (id, canvas_data) => req("PUT", `/boards/${id}/canvas`, { canvas_data }),
  deleteBoard: (id) => req("DELETE", `/boards/${id}`),
  inviteCollaborator: (id, email, role) => req("POST", `/boards/${id}/collaborators`, { email, role }),

  // Templates
  getTemplates: () => req("GET", "/templates"),

  // AI
  summarize: (text) => req("POST", "/ai/summarize", { text }),
};

// ─── Groups / Collaboration ──────────────────────────────────────────────
export const groupsApi = {
  list:         ()           => req("GET",  "/groups"),
  create:       (data)       => req("POST", "/groups", data),
  members:      (id)         => req("GET",  `/groups/${id}/members`),
  invite:       (id, email)  => req("POST", `/groups/${id}/invite`, { email }),
  join:         (code)       => req("POST", "/groups/join", { code }),
  removeMember: (gid, uid)   => req("DELETE", `/groups/${gid}/members/${uid}`),
};
