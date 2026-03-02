import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

const AdminLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-tr from-teal-400 via-cyan-300 to-sky-400 flex flex-col">
            <AdminNavbar />
            <div className="flex-grow flex flex-col p-4 md:p-8">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl w-full flex-grow flex flex-col p-6 overflow-hidden">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
