import './RouteErrorPage.css';

const RouteLoading = () => (
  <main className="route-error" aria-busy="true" aria-live="polite">
    <section className="route-error__card">
      <p className="route-error__status">Carregando</p>
      <h1>Preparando a interface…</h1>
    </section>
  </main>
);

export default RouteLoading;
