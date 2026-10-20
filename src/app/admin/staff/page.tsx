import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { setRoleAction } from "@/lib/actions";
import { ownerPhones, requireStaff } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.staff} · ${t.common.adminTabs.label}` };
}

const CHOICES = ["customer", "delivery", "admin", "owner"] as const;

export default async function Staff() {
  const me = await requireStaff("staff", "/admin/staff");
  await connectDB();
  const owners = ownerPhones();
  const [team, ownerUsers] = await Promise.all([
    User.find({ role: { $in: ["delivery", "admin", "owner"] }, phone: { $nin: owners } }).sort({ role: 1, name: 1 }).lean(),
    User.find({ phone: { $in: owners } }).lean(),
  ]);
  const t = await getT();
  const s = t.staff.staff;

  return (
    <>
      <h1>{t.common.adminTabs.staff}</h1>
      <p className="muted">{rich(s.intro, { b: (x) => <strong>{x}</strong> })}</p>
      <ul className="role-guide">
        {(["delivery", "admin", "owner"] as const).map((r) => (
          <li key={r}>
            <strong>{s.roles[r]}</strong> {s.what[r]}
          </li>
        ))}
      </ul>

      <section className="panel" aria-labelledby="add">
        <h2 id="add">{s.add}</h2>
        <ActionForm action={setRoleAction} submit={s.saveRole} primary className="staff-form">
          <label>
            {s.mobile}
            <input name="phone" type="tel" inputMode="numeric" autoComplete="off" required maxLength={20} placeholder="98765 43210" />
          </label>
          <label>
            {s.name}
            <input name="name" maxLength={80} autoComplete="off" placeholder={s.namePlaceholder} />
          </label>
          <label>
            {s.role}
            <select name="role" defaultValue="delivery">
              {CHOICES.map((r) => (
                <option key={r} value={r}>
                  {s.roles[r]}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </section>

      <h2>{s.team}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>{s.person}</th>
            <th>{s.role}</th>
          </tr>
        </thead>
        <tbody>
          {owners.map((phone) => (
            <tr key={phone}>
              <td data-label={s.person}>
                <strong>{ownerUsers.find((u) => u.phone === phone)?.name || s.roles.owner}</strong>
                <small>{phone}</small>
              </td>
              <td data-label={s.role}>
                <span className="pill delivered">{s.roles.owner}</span> <small>{s.changeIn}</small>
              </td>
            </tr>
          ))}
          {team.map((u) => (
            <tr key={String(u._id)}>
              <td data-label={s.person}>
                <strong>{u.name || s.noName}</strong>
                <small>{u.phone}</small>
              </td>
              <td data-label={s.role}>
                {u.phone === me.phone ? (
                  <>
                    <span className="pill delivered">{s.roles[u.role ?? "customer"]}</span> <small>{s.you}</small>
                  </>
                ) : (
                  <ActionForm action={setRoleAction} submit={t.common.words.change} className="inline-form">
                    <input type="hidden" name="phone" value={u.phone ?? ""} />
                    <select key={u.role} name="role" defaultValue={u.role ?? "customer"} aria-label={fill(s.roleFor, { who: u.name || u.phone || "" })}>
                      {CHOICES.map((r) => (
                        <option key={r} value={r}>
                          {r === "customer" ? s.removeCustomer : s.roles[r]}
                        </option>
                      ))}
                    </select>
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!team.length && <p className="muted">{s.none}</p>}
    </>
  );
}
