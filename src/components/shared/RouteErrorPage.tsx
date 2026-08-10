import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import './RouteErrorPage.css';

const RouteErrorPage = () => {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : undefined;

  return (
    <main className="route-error" role="alert">
      <section className="route-error__card">
        <p className="route-error__status">{status ? `Erro ${status}` : 'Rota indisponível'}</p>
        <h1>Não foi possível abrir esta página.</h1>
        <p>Volte ao envio de documentos e tente novamente.</p>
        <Link to="/upload">Ir para o processamento</Link>
      </section>
    </main>
  );
};

export default RouteErrorPage;
