import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AddApplication from "./component/AddApplication";
import ShowApplications from "./component/ShowApplications";
import ShowDocuments from "./component/ShowDocuments";
import ApplicationDetails from "./component/ApplicationDetails";
import Layout from "./component/Layout";
import 'react-toastify/dist/ReactToastify.css';
import AddDocument from "./component/AddDocument";
import { ToastContainer } from "react-toastify";
import EditDocument from "./component/EditDocument";


const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ShowApplications />} /> {/* Set ShowApplications as the default page */}
            <Route path="application/new" element={<AddApplication />} /> {/* Keep Dashboard accessible */}
            <Route path="applications" element={<ShowApplications />} />
            <Route path="application/:appId" element={<ApplicationDetails />} />
            <Route path="documents" element={<ShowDocuments />} /> {/* New Documents page */}
            <Route path="document/new" element={<AddDocument />} /> {/* AddDocument component for file upload */}
            <Route path="/document/edit/:id" element={<EditDocument />} />{/* EditDocument component for editing documents */}
            {/* <Route path="" element={<ApplicationForm />} /> */}

          </Route>
        </Routes>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={3}
        theme="light"
      />

    </QueryClientProvider>
  );
};

export default App;
