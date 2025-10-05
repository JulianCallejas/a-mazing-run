import React from 'react';

interface MedievalPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const MedievalPanel: React.FC<MedievalPanelProps> = ({
  children,
  title,
  className = ''
}) => {
  return (
    <div className={`
      bg-gradient-to-br from-amber-50 to-amber-100 
      border-4 border-amber-900 rounded-xl shadow-2xl
      relative overflow-hidden
      ${className}
    `}>
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-amber-700 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-amber-700 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-amber-700 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-amber-700 rounded-br-lg" />
      
      {/* Parchment texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-repeat bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23000%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M0%200h20v20H0V0zm10%2017a7%207%200%201%200%200-14%207%207%200%200%200%200%2014z%22/%3E%3C/g%3E%3C/svg%3E')]" />
      
      <div className="relative p-6">
        {title && (
          <h2 className="font-cinzel-decorative text-2xl font-bold text-amber-900 mb-4 text-center">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};

export default MedievalPanel;