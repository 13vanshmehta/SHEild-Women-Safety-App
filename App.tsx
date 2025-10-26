import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/components/AppNavigator';

const AppContent = () => {
  return <AppNavigator />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
