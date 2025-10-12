import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvolutionContacts } from '../../lib/getEvolutionContacts';
import { checkInstanceStatus } from '../../lib/checkInstanceStatus';
import { toast } from 'sonner';

const SalasPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportUser, setSupportUser] = useState<any>(null);

  useEffect(() => {
    // Verificar se o usuário está logado
    const supportUserData = sessionStorage.getItem('support_user');
    
    if (!supportUserData) {
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/support-login');
      return;
    }

    const user = JSON.parse(supportUserData);
    setSupportUser(user);
    loadContacts();
  }, [navigate]);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    setContacts([]);

    try {
      const instanceName = 'default';
      const apiKeyEvolution = import.meta.env.VITE_EVO_API_KEY as string;

      const statusResponse = await checkInstanceStatus(instanceName, apiKeyEvolution);

      if (statusResponse.state !== 'open') {
        setError('Nenhuma conta WhatsApp está conectada. Informe o administrador responsável para realizar a conexão no painel de administração.');
        setIsLoading(false);
        return;
      }

      const contactsResponse = await getEvolutionContacts(instanceName, apiKeyEvolution);
      setContacts(contactsResponse);

    } catch (err) {
      setError('Ocorreu um erro ao buscar os dados. Tente novamente.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Salas de Atendimento</h1>
            {supportUser && (
              <p className="text-sm text-gray-600">Bem-vindo(a), {supportUser.full_name}</p>
            )}
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('support_user');
              navigate('/support-login');
            }}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            Sair
          </button>
        </div>

        {isLoading && (
          <div className="text-center p-8">
            <p className="text-gray-600">Carregando contatos...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-4 bg-red-100 text-red-700 rounded-md">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!isLoading && contacts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 bg-gray-100 p-4 rounded-lg">
              <h2 className="font-bold mb-2">Contatos</h2>
              <ul>
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex items-center p-2 hover:bg-gray-200 rounded-md cursor-pointer">
                    <img src={contact.profilePicUrl} alt={contact.pushName || contact.name} className="w-10 h-10 rounded-full mr-3" />
                    <div>
                      <p className="font-semibold">{contact.pushName || contact.name}</p>
                      <p className="text-sm text-gray-600 truncate">{contact.lastMessage?.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 bg-gray-200 p-4 rounded-lg flex items-center justify-center">
              <p>Selecione um contato para iniciar a conversa.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalasPage;