import { useState } from 'react';
import { useGetRolesQuery, useGetFeaturesQuery, useSetRoleFeaturesMutation } from '../../features/roles/rolesApi';

const GROUP_LABEL = { main: 'Main Menu', mgmt: 'Management' };

export default function RolesPage() {
  const { data: roles,    isLoading: loadingRoles }    = useGetRolesQuery();
  const { data: features, isLoading: loadingFeatures } = useGetFeaturesQuery();
  const [setFeatures, { isLoading: saving }] = useSetRoleFeaturesMutation();

  const [selected, setSelected] = useState(null); // role id
  const [checked, setChecked]   = useState({});    // { featureKey: bool }
  const [saved, setSaved]       = useState(false);

  function selectRole(r) {
    setSelected(r.id);
    const map = {};
    (r.features || []).forEach(k => { map[k] = true; });
    setChecked(map);
    setSaved(false);
  }

  function toggle(key) {
    setChecked(c => ({ ...c, [key]: !c[key] }));
    setSaved(false);
  }

  async function handleSave() {
    const keys = Object.keys(checked).filter(k => checked[k]);
    await setFeatures({ id: selected, features: keys });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loadingRoles || loadingFeatures) {
    return <div className="p-6 text-slate-400 text-sm">Loading…</div>;
  }

  const currentRole = roles?.find(r => r.id === selected);
  const grouped = {};
  (features || []).forEach(f => {
    const g = f.group || 'main';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(f);
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Role Permissions</h1>
        <p className="text-sm text-slate-400 mt-1">Control which menu items each role can access. Admin always has full access.</p>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2">
        {roles?.filter(r => r.name !== 'admin').map(r => (
          <button key={r.id} onClick={() => selectRole(r)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${
              selected === r.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}>
            {r.name}
          </button>
        ))}
      </div>

      {!selected && (
        <div className="py-10 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100">
          Select a role above to manage its permissions
        </div>
      )}

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 capitalize">{currentRole?.name} — menu access</h2>
            <button onClick={handleSave} disabled={saving}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
              }`}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>

          {Object.entries(grouped).map(([group, feats]) => (
            <div key={group}>
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{GROUP_LABEL[group] || group}</p>
              </div>
              <div className="divide-y divide-slate-50">
                {feats.map(f => (
                  <label key={f.key}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                      <p className="text-xs text-slate-400 font-mono">{f.path}</p>
                    </div>
                    <div className={`relative w-10 h-5 rounded-full transition-colors ${checked[f.key] ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      <input type="checkbox" className="sr-only" checked={!!checked[f.key]} onChange={() => toggle(f.key)} />
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked[f.key] ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
