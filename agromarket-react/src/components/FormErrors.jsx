// Показывает общий текст ошибки и, если сервер прислал details (валидация zod),
// список «поле — сообщение». Один компонент для всех форм.
export default function FormErrors({ error, details = [] }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      <p>{error}</p>
      {details.length > 0 && (
        <ul>
          {details.map((d, i) => (
            <li key={`${d.field}-${i}`}>{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
