
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
    const location = useLocation();

    const isApplicationsPage = location.pathname === '/' || location.pathname === '/applications';
    const isDocumentsPage = location.pathname === '/documents';

    return (
        <div className="px-8 py-0 border-b border-slate-200">
            <div className="py-2" />

            <div className="flex space-x-8">
                <Link
                    to="/applications"
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg focus:outline-none transition-colors ${isApplicationsPage
                        ? 'bg-white border-t border-l border-r border-gray-200 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Applications
                </Link>
                <Link
                    to="/documents"
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg focus:outline-none transition-colors ${isDocumentsPage
                        ? 'bg-white border-t border-l border-r border-gray-200 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Documents
                </Link>
            </div>
            <div className="py-2" />
        </div>
    );
};

export default Navigation; 