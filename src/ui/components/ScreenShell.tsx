import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shared frame for secondary menu screens: back action, gilded title, iron panel. */
const ScreenShell = ({ title, subtitle, children }: ScreenShellProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
      <div className="max-w-4xl animate-rise">
        <button type="button" className="btn btn-ghost px-4 py-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <h1 className="mt-6 title-gilded text-5xl sm:text-6xl">{title}</h1>
        {subtitle && <p className="mt-2 font-label text-lg text-parchment-300">{subtitle}</p>}
        <div className="panel mt-6 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
};

export default ScreenShell;
