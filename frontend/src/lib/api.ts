import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSubjects = async () => {
  const response = await apiClient.get('/subjects/');
  return response.data;
};

export const generateSchedule = async (subjects, daysLeft, totalHours) => {
  const response = await apiClient.post('/schedule/generate', {
    subjects: subjects.map(s => ({
      name: s.name,
      difficulty: s.difficulty_level || 3,
      past_score: s.past_score || 70
    })),
    days_left: daysLeft,
    total_hours_per_day: totalHours,
  });
  return response.data;
};

export const getTasks = async (subjectId: int) => {
  const response = await apiClient.get(`/tasks/subject/${subjectId}`);
  return response.data;
};

export const updateTaskStatus = async (taskId: int, status: string) => {
  const response = await apiClient.put(`/tasks/${taskId}/status?status=${status}`);
  return response.data;
};
