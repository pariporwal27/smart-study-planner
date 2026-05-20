// Modify task status between pending and complete
// Fetch task sub-elements associated with specific subject id
// Post inputs to ML model allocating appropriate hours
// Get all active user subjects from database storage
// Standard Axios client configured for local backend address
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-study-planner-e22b.onrender.com/api/v1';

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

export const generateSchedule = async (subjects: any[], daysLeft: number, totalHours: number) => {
  // Map difficulty & past_score keys if present
  const response = await apiClient.post('/schedule/generate', {
    subjects: subjects.map(s => ({
      name: s.name,
      difficulty: s.difficulty || s.difficulty_level || 3,
      past_score: s.past_score || 70
    })),
    days_left: daysLeft,
    total_hours_per_day: totalHours,
  });
  return response.data;
};

export const getTasks = async (subjectId: number) => {
  const response = await apiClient.get(`/tasks/subject/${subjectId}`);
  return response.data;
};

export const updateTaskStatus = async (taskId: number, status: string) => {
  const response = await apiClient.put(`/tasks/${taskId}/status?status=${status}`);
  return response.data;
};

export const askChatbot = async (message: string, subject: string = 'general') => {
  const response = await apiClient.post('/chat/', { message, subject });
  return response.data;
};
