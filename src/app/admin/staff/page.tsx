import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { setRoleAction } from "@/lib/actions";
import { ownerPhones, requireStaff } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";

export const metadata: Metadata = { title: "Staff · Admin" };

const CHOICES = ["customer", "delivery", "admin"] as const;
const WHAT = {
  delivery: "Sees only the orders given to them, hands them over with the customer’s code and collects cash.",
  admin: "Runs orders, inventory, customers, sales and cash. Can’t change staff or read the audit log.",
  owner: "Everything, including staff and the audit log. Set by ADMIN_PHONES on the server.",
};

export default async function Staff() {
  await requireStaff("staff", "/admin/staff");
  await connectDB();
  const owners = ownerPhones();
  const [team, ownerUsers] = await Promise.all([
    User.find({ role: { $in: ["delivery", "admin"] }, phone: { $nin: owners } }).sort({ role: 1, name: 1 }).lean(),
    User.find({ phone: { $in: owners } }).lean(),
  ]);

  return (
    <>
      <h1>Staff</h1>
      <p className="muted">Add someone by their mobile number here, then they tap <strong>Forgot password?</strong> on the login page once to set their own password. Their role decides what they see.</p>
      <ul className="role-guide">
        {(["delivery", "admin", "owner"] as const).map((r) => (
          <li key={r}>
            <strong>{ROLE_LABEL[r]}</strong> {WHAT[r]}
          </li>
        ))}
      </ul>

      <section className="panel" aria-labelledby="add">
        <h2 id="add">Add or Change Someone</h2>
        <ActionForm action={setRoleAction} submit="Save Role" primary className="staff-form">
          <label>
            Mobile number
            <input name="phone" type="tel" inputMode="numeric" autoComplete="off" required maxLength={20} placeholder="98765 43210" />
          </label>
          <label>
            Name
            <input name="name" maxLength={80} autoComplete="off" placeholder="Ramesh…" />
          </label>
          <label>
            Role
            <select name="role" defaultValue="delivery">
              {CHOICES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </section>

      <h2>Team</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {owners.map((phone) => (
            <tr key={phone}>
              <td data-label="Person">
                <strong>{ownerUsers.find((u) => u.phone === phone)?.name || "Owner"}</strong>
                <small>{phone}</small>
              </td>
              <td data-label="Role">
                <span className="pill delivered">Owner</span> <small>Change in ADMIN_PHONES</small>
              </td>
            </tr>
          ))}
          {team.map((u) => (
            <tr key={String(u._id)}>
              <td data-label="Person">
                <strong>{u.name || "No name yet"}</strong>
                <small>{u.phone}</small>
              </td>
              <td data-label="Role">
                <ActionForm action={setRoleAction} submit="Change" className="inline-form">
                  <input type="hidden" name="phone" value={u.phone ?? ""} />
                  <select key={u.role} name="role" defaultValue={u.role ?? "customer"} aria-label={`Role for ${u.name || u.phone}`}>
                    {CHOICES.map((r) => (
                      <option key={r} value={r}>
                        {r === "customer" ? "Customer (remove from staff)" : ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </ActionForm>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!team.length && <p className="muted">No staff yet besides the owner. Add your delivery team above.</p>}
    </>
  );
}
