import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Workspace from '../pages/Workspace';
import ApiCanvasPage from '../pages/canvas/ApiCanvasPage';
import NotFound from '../pages/NotFound';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:workspaceId" element={<Workspace />} />
        <Route path="/workspace/:workspaceId/canvas" element={<ApiCanvasPage />} />
        <Route
          path="/workspace/:workspaceId/collections/:collectionId/requests/:requestId"
          element={<Workspace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
