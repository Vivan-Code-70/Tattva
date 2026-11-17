import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Users,
  Clock,
  Trash2,
  Edit3,
} from 'lucide-react';
import { RegisteredUserRecord, UserRole } from '../../types';
import { AuthService } from '../../services/authService';

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'parent', label: 'Parent / Guardian' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Facilitator' },
  { value: 'support', label: 'Staff / Coordinator' },
  { value: 'admin', label: 'Admin' },
  { value: 'principal', label: 'Centre Head' },
  { value: 'security', label: 'Gate Security' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'driver', label: 'Bus Driver' },
];

const AVAILABLE_CLASSES = ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'];
const AVAILABLE_CHILDREN = [
  { key: 'vivan', label: 'Vivan (Grade 10-A)' },
  { key: 'krishvika', label: 'Krishvika (Grade 8-B)' },
];

interface RbacDirectoryPanelProps {
  onRoleChanged?: () => void;
}

export const RbacDirectoryPanel: React.FC<RbacDirectoryPanelProps> = ({ onRoleChanged }) => {
  const [users, setUsers] = useState<RegisteredUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<UserRole[]>(['parent']);
  const [newClasses, setNewClasses] = useState<string[]>(['Grade 10-A']);
  const [newChildren, setNewChildren] = useState<string[]>(['vivan']);
  const [submitting, setSubmitting] = useState(false);

  // Edit user state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [editChildren, setEditChildren] = useState<string[]>([]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.listRegisteredUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load registered user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleItem = <T extends string>(list: T[], val: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(list.includes(val) ? list.filter((i) => i !== val) : [...list, val]);
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!newEmail.trim() || newRoles.length === 0) {
      setError('Please enter a valid email address and select at least one role.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await AuthService.registerUser({
        email: newEmail.trim(),
        name: newName.trim() || newEmail.trim().split('@')[0],
        roles: newRoles,
        assignedClasses: newRoles.includes('teacher') ? newClasses : undefined,
        childrenKeys: newRoles.includes('parent') ? newChildren : undefined,
      });
      setUsers((prev) => [res.user, ...prev]);
      setNotice(`Registered ${res.user.email} with role(s): ${res.user.roles.join(', ')}`);
      setNewEmail('');
      setNewName('');
      if (onRoleChanged) onRoleChanged();
    } catch (err: any) {
      setError(err?.message || 'Failed to register user.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (u: RegisteredUserRecord) => {
    setEditingKey(u.userKey);
    setEditRoles([...u.roles]);
    setEditClasses([...(u.assignedClasses || [])]);
    setEditChildren([...(u.childrenKeys || [])]);
    setError(null);
    setNotice(null);
  };

  const handleSaveEdit = async (userKey: string) => {
    if (editRoles.length === 0) {
      setError('User must have at least one role assigned.');
      return;
    }
    try {
      const res = await AuthService.updateUserRoles(userKey, {
        roles: editRoles,
        assignedClasses: editClasses,
        childrenKeys: editChildren,
      });
      setUsers((prev) => prev.map((u) => (u.userKey === userKey ? res.user : u)));
      setEditingKey(null);
      setNotice(`Updated permissions for ${res.user.name} (v${res.user.rolesVersion}). Active sessions reflect changes immediately.`);
      if (onRoleChanged) onRoleChanged();
    } catch (err: any) {
      setError(err?.message || 'Unable to update user roles.');
    }
  };

  const handleToggleActive = async (u: RegisteredUserRecord) => {
    try {
      const res = await AuthService.updateUserRoles(u.userKey, { active: !u.active });
      setUsers((prev) => prev.map((item) => (item.userKey === u.userKey ? res.user : item)));
      setNotice(`${res.user.name} is now ${res.user.active ? 'active' : 'deactivated'}.`);
      if (onRoleChanged) onRoleChanged();
    } catch (err: any) {
      setError(err?.message || 'Unable to update active status.');
    }
  };

  const handleDeleteUser = async (userKey: string) => {
    try {
      await AuthService.removeRegisteredUser(userKey);
      setUsers((prev) => prev.filter((u) => u.userKey !== userKey));
      setNotice('User removed from registered school directory.');
      if (onRoleChanged) onRoleChanged();
    } catch (err: any) {
      setError(err?.message || 'Cannot remove user.');
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 dark:border-stone-800 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Registered School Directory &amp; Role-Based Access Control (RBAC)</span>
          </h3>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Register Gmail/school emails, assign single or multiple roles, and scope classes or children on the backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => AuthService.expireSessionForTest()}
            className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Test Session Expiry</span>
          </button>
          <button
            type="button"
            onClick={loadUsers}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-700 hover:underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Register New Google / School Email Form */}
      <form
        onSubmit={handleRegisterUser}
        className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3"
      >
        <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-orange-600" />
          <span>Register Google / School Email Account</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <input
            type="email"
            required
            placeholder="parent.or.staff@gmail.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
          />
          <input
            type="text"
            placeholder="Full Name (e.g., Ms. Priya Nair)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block">
            Assign Role(s) — multi-role supported (e.g. Staff + Parent):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ALL_ROLES.map((r) => {
              const selected = newRoles.includes(r.value);
              return (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => toggleItem(newRoles, r.value, setNewRoles)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                    selected
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {(newRoles.includes('teacher') || newRoles.includes('parent')) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
            {newRoles.includes('teacher') && (
              <div className="space-y-1">
                <span className="font-bold text-stone-600 dark:text-stone-400 block">Assigned Classes:</span>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_CLASSES.map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => toggleItem(newClasses, cls, setNewClasses)}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer ${
                        newClasses.includes(cls)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {newRoles.includes('parent') && (
              <div className="space-y-1">
                <span className="font-bold text-stone-600 dark:text-stone-400 block">Linked Children:</span>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_CHILDREN.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => toggleItem(newChildren, c.key, setNewChildren)}
                      className={`px-2 py-0.5 rounded-md border cursor-pointer ${
                        newChildren.includes(c.key)
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-orange-600 hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Registering...' : 'Register Account'}
        </button>
      </form>

      {/* Registered User Directory Table */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {users.map((u) => {
          const isEditing = editingKey === u.userKey;
          return (
            <div
              key={u.userKey}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900 dark:text-stone-100">{u.name}</span>
                    <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">{u.email}</span>
                    {!u.active && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 text-[10px] font-bold uppercase"
                      >
                        {r}
                      </span>
                    ))}
                    {u.assignedClasses && u.assignedClasses.length > 0 && (
                      <span className="text-[10px] text-stone-500 font-mono">
                        Classes: {u.assignedClasses.join(', ')}
                      </span>
                    )}
                    {u.childrenKeys && u.childrenKeys.length > 0 && (
                      <span className="text-[10px] text-sky-700 dark:text-sky-400 font-mono">
                        Children: {u.childrenKeys.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingKey(null) : startEditing(u))}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-[11px] hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditing ? 'Cancel' : 'Edit Roles'}</span>
                  </button>
                  {u.userKey !== 'sandhya' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-[11px] hover:bg-stone-100 cursor-pointer"
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.userKey)}
                        aria-label={`Remove ${u.name}`}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((r) => (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => toggleItem(editRoles, r.value, setEditRoles)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer ${
                          editRoles.includes(r.value)
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    {editRoles.includes('teacher') && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-stone-500">Classes:</span>
                        {AVAILABLE_CLASSES.map((cls) => (
                          <button
                            type="button"
                            key={cls}
                            onClick={() => toggleItem(editClasses, cls, setEditClasses)}
                            className={`px-2 py-0.5 rounded border cursor-pointer ${
                              editClasses.includes(cls)
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    )}
                    {editRoles.includes('parent') && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-stone-500">Children:</span>
                        {AVAILABLE_CHILDREN.map((c) => (
                          <button
                            type="button"
                            key={c.key}
                            onClick={() => toggleItem(editChildren, c.key, setEditChildren)}
                            className={`px-2 py-0.5 rounded border cursor-pointer ${
                              editChildren.includes(c.key)
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700'
                            }`}
                          >
                            {c.key}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(u.userKey)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Role Changes</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
