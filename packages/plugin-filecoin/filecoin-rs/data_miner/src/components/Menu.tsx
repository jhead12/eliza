import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';

interface MenuProps {
  token: string;
}

const Menu: React.FC<MenuProps> = ({ token }) => {
  const navigate = useNavigate();

  const handleMenuClick = async (route: string, src?: string) => {
    if (!token && route !== 'options' && route !== 'placeholder') {
      console.log('Authentication required');
      return;
    }

    switch (route) {
      case 'data-transfers':
        await invoke('open_telemetry_window');
        navigate('/data-transfers');
        break;
      case 'character-builder':
        console.log('Opening Character Builder...', src);
        if (src) window.open(src, '_blank');
        break;
      case 'database':
        console.log('Opening Database...', src);
        if (src) window.open(src, '_blank');
        break;
      case 'performance':
        console.log('Checking Performance...', src);
        if (src) window.open(src, '_blank');
        break;
      case 'portfolio-tracker':
        console.log('Opening Portfolio Tracker...', src);
        if (src) window.open(src, '_blank');
        break;
      case 'market-analysis':
        console.log('Opening Market Analysis...', src);
        if (src) window.open(src, '_blank');
        break;
      case 'agent-design':
        console.log('Opening Agent Design...', src);
        break;
      case 'bitcoin-invest':
        console.log('Entering Bitcoin Invest...', src);
        break;
      default:
        console.log(`Route ${route} not implemented yet.`);
    }
  };

  return (
    <section className="menu">
      <ul className="main-menu">
        <li className="menu-item" onClick={() => handleMenuClick('data-transfers', '/src/telemetry.html')}>
          Data Transfers
        </li>
        <li className="menu-item has-submenu">
          Agent Design
          <ul className="submenu">
            <li
              className="menu-item"
              onClick={() => handleMenuClick('character-builder', 'http://localhost:8083')}
            >
              Character Builder
            </li>
          </ul>
        </li>
        <li className="menu-item" onClick={() => handleMenuClick('database', 'http://localhost:8084')}>
          Database
        </li>
        <li className="menu-item" onClick={() => handleMenuClick('performance', 'http://localhost:8085')}>
          Performance
        </li>
        <li className="menu-item has-submenu">
          Bitcoin Invest
          <ul className="submenu">
            <li
              className="menu-item"
              onClick={() => handleMenuClick('portfolio-tracker', 'http://localhost:8086/portfolio')}
            >
              Portfolio Tracker
            </li>
            <li
              className="menu-item"
              onClick={() => handleMenuClick('market-analysis', 'http://localhost:8086/market')}
            >
              Market Analysis
            </li>
          </ul>
        </li>
      </ul>
    </section>
  );
};

export default Menu;