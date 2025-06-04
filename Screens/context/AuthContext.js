import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  return (
    <AuthContext.Provider
      value={{
        userToken,
        userInfo,
        setUserToken,
        setUserInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};