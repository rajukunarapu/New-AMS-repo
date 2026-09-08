import React from 'react';
import AppRoutes from './Routes/AppRoutes';
import NetworkStatusComponent from './ErrorBoundaries/Network/NetworkStatusComponent';
import ErrorBoundaryComponent from './ErrorBoundaries/Errors/ErrorBoundaryComponent';
import ErrorUI from './ErrorBoundaries/Errors/ErrorUI';
import { ThemeProvider } from './Context/ThemeContext';
import { NeoAIProvider } from './Context/NeoAIContext';

const App = () => {
  return (
    <ThemeProvider>
      <NeoAIProvider>
        <NetworkStatusComponent>
          <ErrorBoundaryComponent fallback={<ErrorUI/>} >
            <AppRoutes/>
          </ErrorBoundaryComponent>
        </NetworkStatusComponent>
      </NeoAIProvider>
    </ThemeProvider>
  );
}

export default App;