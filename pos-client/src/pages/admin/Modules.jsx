import { useGetModulesQuery, useToggleModuleMutation } from '../../features/modules/modulesApi';

const IconSms = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const IconAccounting = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
  </svg>
);

const IconLoadingSheet = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 16V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1m8-1h3m0 0h1a1 1 0 0 0 1-1v-5l-3-4H14a1 1 0 0 0-1 1v8m0 0H9"/>
  </svg>
);

const MODULE_ICONS = {
  sms:           IconSms,
  accounting:    IconAccounting,
  loading_sheet: IconLoadingSheet,
  coop_city:     IconLoadingSheet,
  payroll:       IconAccounting,
};

function Toggle({ enabled, loading, onChange }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${enabled ? 'bg-blue-600' : 'bg-slate-600'}
        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
        ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function ModuleCard({ mod, onToggle, toggling }) {
  const icon = MODULE_ICONS[mod.key] || IconAccounting;

  return (
    <div className={`bg-white dark:bg-[#1e1e1e] rounded-xl border transition-colors duration-200
      ${mod.enabled ? 'border-blue-200 dark:border-blue-900' : 'border-slate-200 dark:border-[#2a2a2a]'}`}>
      <div className="p-5 flex items-start gap-4">
        <div className={`p-2.5 rounded-lg shrink-0
          ${mod.enabled ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-[#2a2a2a] text-slate-400'}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">{mod.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
            </div>
            <Toggle
              enabled={mod.enabled}
              loading={toggling}
              onChange={() => onToggle(mod.key)}
            />
          </div>

          {mod.insertsFeature && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {mod.enabled
                ? 'Feature row active — assign to roles via Settings › Roles'
                : 'Enabling this will register the module in the feature table'}
            </p>
          )}
        </div>
      </div>

      <div className={`px-5 py-2 rounded-b-xl border-t text-xs font-medium
        ${mod.enabled
          ? 'border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400'
          : 'border-slate-100 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#252525] text-slate-400'}`}>
        {mod.enabled ? 'Enabled' : 'Disabled'}
      </div>
    </div>
  );
}

export default function ModulesPage() {
  const { data: modules = [], isLoading } = useGetModulesQuery();
  const [toggleModule, { isLoading: toggling, originalArgs: togglingKey }] = useToggleModuleMutation();

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Modules</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enable or disable optional system modules. Changes take effect immediately.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-[#2a2a2a] p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map(mod => (
            <ModuleCard
              key={mod.key}
              mod={mod}
              onToggle={key => toggleModule(key)}
              toggling={toggling && togglingKey === mod.key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
