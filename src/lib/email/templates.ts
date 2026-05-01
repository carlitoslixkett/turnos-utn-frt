const BRAND_COLOR = "#E94A1F";

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="font-family: system-ui, -apple-system, sans-serif; background: #f7f7f7; margin: 0; padding: 24px; color: #0a0a0a;">
    <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.06);">
      <div style="background: ${BRAND_COLOR}; padding: 20px 24px;">
        <h1 style="margin: 0; color: #fff; font-size: 20px; letter-spacing: .5px;">UTN FRT — Turnos</h1>
      </div>
      <div style="padding: 28px 24px;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">${title}</h2>
        ${body}
      </div>
      <div style="padding: 14px 24px; background: #fafafa; color: #6b6b6b; font-size: 12px; text-align: center;">
        Departamento de Alumnos — UTN Facultad Regional Tucumán
      </div>
    </div>
  </body>
</html>`;
}

export function cancelLockoutEmail(params: { fullName: string; blockMinutes: number }): {
  subject: string;
  html: string;
} {
  const body = `
    <p>Hola <strong>${escape(params.fullName)}</strong>,</p>
    <p>Detectamos <strong>3 intentos fallidos</strong> al ingresar el código de seguridad para cancelar un turno.</p>
    <p>Por seguridad, la opción de cancelación quedó <strong>bloqueada durante ${params.blockMinutes} minutos</strong>.</p>
    <p>Si no fuiste vos quien hizo estos intentos, te recomendamos cambiar tu contraseña.</p>
  `;
  return {
    subject: "Bloqueo temporal de cancelación de turno",
    html: layout("Bloqueo temporal de cancelación", body),
  };
}

export function intervalDeactivatedEmail(params: {
  fullName: string;
  intervalName: string;
  turnDate: string;
  explanation?: string | null;
}): { subject: string; html: string } {
  const explanation = params.explanation
    ? `<p style="padding:12px 14px;background:#fff7ed;border-left:3px solid ${BRAND_COLOR};border-radius:6px;"><em>${escape(
        params.explanation
      )}</em></p>`
    : "";
  const body = `
    <p>Hola <strong>${escape(params.fullName)}</strong>,</p>
    <p>Te informamos que el intervalo <strong>${escape(params.intervalName)}</strong>, al cual pertenecía tu turno del <strong>${escape(
      params.turnDate
    )}</strong>, fue <strong>desactivado</strong>.</p>
    ${explanation}
    <p>Tu turno fue <strong>cancelado</strong> automáticamente. Podés sacar un nuevo turno desde el sistema cuando lo necesites.</p>
  `;
  return {
    subject: "Tu turno fue cancelado — intervalo desactivado",
    html: layout("Intervalo desactivado", body),
  };
}

export function turnCancelledByClosureEmail(params: {
  fullName: string;
  turnDate: string;
  reason: string;
}): { subject: string; html: string } {
  const body = `
    <p>Hola <strong>${escape(params.fullName)}</strong>,</p>
    <p>Te informamos que tu turno del <strong>${escape(params.turnDate)}</strong> fue
    <strong>cancelado</strong> porque la oficina no atenderá ese día.</p>
    <p style="padding:12px 14px;background:#fff7ed;border-left:3px solid ${BRAND_COLOR};border-radius:6px;">
      <strong>Motivo:</strong> ${escape(params.reason)}
    </p>
    <p>Lamentamos las molestias. Podés sacar un nuevo turno desde el sistema cuando quieras.</p>
  `;
  return {
    subject: "Tu turno fue cancelado — la oficina no atiende ese día",
    html: layout("Cancelación por cierre de oficina", body),
  };
}

export function turnCancelledByWorkerEmail(params: {
  fullName: string;
  turnDate: string;
  reason: string;
}): { subject: string; html: string } {
  const body = `
    <p>Hola <strong>${escape(params.fullName)}</strong>,</p>
    <p>Tu turno del <strong>${escape(params.turnDate)}</strong> fue <strong>cancelado</strong>
    por el personal del Departamento de Alumnos.</p>
    <p style="padding:12px 14px;background:#fff7ed;border-left:3px solid ${BRAND_COLOR};border-radius:6px;">
      <strong>Motivo:</strong> ${escape(params.reason)}
    </p>
    <p>Si necesitás atención, podés sacar un nuevo turno desde el sistema.</p>
  `;
  return {
    subject: "Tu turno fue cancelado",
    html: layout("Turno cancelado", body),
  };
}

export function welcomeEmail(params: { fullName: string }): { subject: string; html: string } {
  const body = `
    <p>Hola <strong>${escape(params.fullName)}</strong>,</p>
    <p>¡Bienvenido/a al sistema de turnos del Departamento de Alumnos de UTN FRT!</p>
    <p>Verificá tu correo desde el email que te enviamos para comenzar a usar el sistema.</p>
  `;
  return {
    subject: "Bienvenido/a a Turnos UTN FRT",
    html: layout("Bienvenido/a", body),
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
