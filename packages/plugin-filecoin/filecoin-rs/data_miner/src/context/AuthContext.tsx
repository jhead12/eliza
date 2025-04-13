import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  token: string;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  token: string;
  setToken: (token: string) => void;
  children: ReactNode;
}> = ({ token, setToken, children }) => {
  return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};