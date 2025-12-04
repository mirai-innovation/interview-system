import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/axios';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      alert('Error al cambiar el estado del usuario');
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (error) {
      alert('Error al cambiar el rol del usuario');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      alert('Error al eliminar el usuario');
    }
  };

  const fetchUserDetails = async (userId) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setUserDetails(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error obteniendo detalles del usuario:', error);
      alert('Error al obtener los detalles del usuario');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeUserDetails = () => {
    setSelectedUser(null);
    setUserDetails(null);
  };

  const getCVUrl = (cvPath) => {
    if (!cvPath) return null;
    // Si es una URL completa (S3), devolverla directamente
    if (cvPath.startsWith('http://') || cvPath.startsWith('https://')) {
      return cvPath;
    }
    // Si es una ruta relativa, construir la URL completa
    const baseURL = import.meta.env.VITE_API_URL || 
      (import.meta.env.PROD ? 'https://interview-system-c1q9.vercel.app/api' : '/api');
    return `${baseURL}${cvPath}`;
  };

  const getVideoUrl = (videoPath) => {
    if (!videoPath) return null;
    // Si es una URL completa (S3), devolverla directamente
    if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
      return videoPath;
    }
    // Si es una ruta relativa, construir la URL completa
    const baseURL = import.meta.env.VITE_API_URL || 
      (import.meta.env.PROD ? 'https://interview-system-c1q9.vercel.app/api' : '/api');
    return `${baseURL}${videoPath}`;
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600">CVs Analizados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.cvAnalyzed}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600">Entrevistas Completadas</p>
              <p className="text-2xl font-bold text-orange-600">{stats.interviewCompleted}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Usuarios</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Rol</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b">
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <select
                        value={user.role}
                        onChange={(e) => changeUserRole(user._id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      {user.isActive ? (
                        <span className="text-green-600">✅ Activo</span>
                      ) : (
                        <span className="text-red-600">❌ Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => fetchUserDetails(user._id)}
                        className="bg-green-500 hover:bg-green-700 text-white px-2 py-1 rounded mr-2 text-sm"
                      >
                        Ver Detalles
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user._id)}
                        className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded mr-2 text-sm"
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Detalles del Usuario */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Detalles del Usuario</h2>
                <button
                  onClick={closeUserDetails}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {loadingDetails ? (
                <div className="p-8 text-center">Cargando...</div>
              ) : userDetails ? (
                <div className="p-6">
                  {/* Información Básica */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4">Información Básica</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600">Nombre:</p>
                        <p className="font-semibold">{userDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email:</p>
                        <p className="font-semibold">{userDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Programa:</p>
                        <p className="font-semibold">{userDetails.program || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estado:</p>
                        <p className={`font-semibold ${userDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {userDetails.isActive ? '✅ Activo' : '❌ Inactivo'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CV */}
                  <div className="mb-6 border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">CV</h3>
                    {userDetails.cvPath ? (
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          Score CV: <span className="font-bold text-blue-600">{userDetails.score || 0}%</span>
                        </p>
                        <p className="text-gray-600">
                          Estado: {userDetails.cvAnalyzed ? '✅ Analizado' : '❌ No analizado'}
                        </p>
                        {userDetails.skills && userDetails.skills.length > 0 && (
                          <div>
                            <p className="text-gray-600 mb-2">Habilidades detectadas:</p>
                            <div className="flex flex-wrap gap-2">
                              {userDetails.skills.map((skill, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <a
                          href={getCVUrl(userDetails.cvPath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2"
                        >
                          📄 Ver/Descargar CV
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay CV subido</p>
                    )}
                  </div>

                  {/* Entrevista */}
                  <div className="mb-6 border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">Entrevista</h3>
                    {userDetails.interviewCompleted ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-600">
                            Score: <span className="font-bold text-green-600">{userDetails.interviewScore || 0}%</span>
                          </p>
                        </div>

                        {/* Video Final */}
                        {userDetails.interviewVideo && (
                          <div>
                            <p className="text-gray-600 mb-2">Video Final:</p>
                            <video
                              controls
                              className="w-full max-w-2xl rounded-lg shadow"
                              src={getVideoUrl(userDetails.interviewVideo)}
                            >
                              Tu navegador no soporta la reproducción de video.
                            </video>
                          </div>
                        )}

                        {/* Preguntas y Respuestas */}
                        {userDetails.questions && userDetails.questions.length > 0 && (
                          <div>
                            <p className="text-gray-600 mb-2 font-semibold">Preguntas y Respuestas:</p>
                            <div className="space-y-4">
                              {userDetails.questions.map((question, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                                  <p className="font-semibold text-gray-800 mb-2">
                                    {idx + 1}. {question}
                                  </p>
                                  <p className="text-gray-600">
                                    {userDetails.interviewResponses && userDetails.interviewResponses[idx] ? (
                                      userDetails.interviewResponses[idx]
                                    ) : (
                                      <span className="text-gray-400">Sin respuesta</span>
                                    )}
                                  </p>
                                  {userDetails.interviewAnalysis && userDetails.interviewAnalysis[idx] && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Score: </span>
                                        {userDetails.interviewAnalysis[idx].score}/100
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        <span className="font-semibold">Evaluación: </span>
                                        {userDetails.interviewAnalysis[idx].explanation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Preguntas por defecto */}
                        {userDetails.interviewResponses && userDetails.interviewResponses.length > (userDetails.questions?.length || 0) && (
                          <div>
                            <p className="text-gray-600 mb-2 font-semibold">Preguntas Adicionales:</p>
                            <div className="space-y-4">
                              {userDetails.interviewResponses.slice(userDetails.questions?.length || 0).map((answer, idx) => {
                                const defaultQuestions = [
                                  "What is your motivation for wanting to come to Mirai Innovation Research Institute?",
                                  "How do you plan to finance your stay and the program in Japan?"
                                ];
                                const questionIndex = (userDetails.questions?.length || 0) + idx;
                                const question = defaultQuestions[idx] || `Pregunta ${questionIndex + 1}`;
                                const analysisIndex = questionIndex;
                                
                                return (
                                  <div key={questionIndex} className="bg-gray-50 p-4 rounded-lg">
                                    <p className="font-semibold text-gray-800 mb-2">
                                      {questionIndex + 1}. {question}
                                    </p>
                                    <p className="text-gray-600">{answer || <span className="text-gray-400">Sin respuesta</span>}</p>
                                    {userDetails.interviewAnalysis && userDetails.interviewAnalysis[analysisIndex] && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-sm text-gray-600">
                                          <span className="font-semibold">Score: </span>
                                          {userDetails.interviewAnalysis[analysisIndex].score}/100
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                          <span className="font-semibold">Evaluación: </span>
                                          {userDetails.interviewAnalysis[analysisIndex].explanation}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Entrevista no completada</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No se pudieron cargar los detalles</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

