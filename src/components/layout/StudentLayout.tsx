import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentNavbar from './StudentNavbar';

const StudentLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col">
            <StudentNavbar />
            <div className="flex-grow flex flex-col p-4 md:p-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full flex-grow flex flex-col p-6 overflow-hidden border border-white/50">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default StudentLayout;
