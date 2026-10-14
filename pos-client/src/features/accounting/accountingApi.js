import { api } from '../../app/baseApi';

export const accountingApi = api.injectEndpoints({
  endpoints: build => ({
    // Accounts
    getAccounts:   build.query({ query: () => '/accounting/accounts', providesTags: ['Accounting'] }),
    createAccount: build.mutation({
      query: body => ({ url: '/accounting/accounts', method: 'POST', body }),
      invalidatesTags: ['Accounting', 'AccountingReports'],
    }),
    updateAccount: build.mutation({
      query: ({ id, ...body }) => ({ url: `/accounting/accounts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Accounting', 'AccountingReports'],
    }),
    deleteAccount: build.mutation({
      query: id => ({ url: `/accounting/accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Accounting', 'AccountingReports'],
    }),

    // Journal
    getJournal: build.query({
      query: ({ page = 1, limit = 20 } = {}) => `/accounting/journal?page=${page}&limit=${limit}`,
      providesTags: ['Accounting'],
    }),
    getJournalEntry: build.query({
      query: id => `/accounting/journal/${id}`,
      providesTags: ['Accounting'],
    }),
    createJournalEntry: build.mutation({
      query: body => ({ url: '/accounting/journal', method: 'POST', body }),
      invalidatesTags: ['Accounting', 'AccountingReports'],
    }),

    // Reports
    getTrialBalance: build.query({ query: () => '/accounting/reports/trial-balance', providesTags: ['AccountingReports'] }),
    getProfitLoss:   build.query({
      query: ({ from, to }) => `/accounting/reports/profit-loss?from=${from}&to=${to}`,
      providesTags: ['AccountingReports'],
    }),

    getBalanceSheet: build.query({
      query: () => '/accounting/reports/balance-sheet',
      providesTags: ['AccountingReports'],
    }),
    getLedger: build.query({
      query: ({ account_id, from, to } = {}) => {
        const p = new URLSearchParams({ account_id });
        if (from) p.set('from', from);
        if (to)   p.set('to', to);
        return `/accounting/ledger?${p.toString()}`;
      },
      providesTags: ['Accounting'],
    }),

    getExpenses: build.query({
      query: ({ page = 1, limit = 20 } = {}) => `/accounting/expenses?page=${page}&limit=${limit}`,
      providesTags: ['Accounting'],
    }),

    getOpeningBalance: build.query({
      query: () => '/accounting/opening-balance',
      providesTags: ['Accounting'],
    }),
    saveOpeningBalance: build.mutation({
      query: body => ({ url: '/accounting/opening-balance', method: 'POST', body }),
      invalidatesTags: ['Accounting', 'AccountingReports'],
    }),

    getCashbook: build.query({
      query: ({ account_id, from, to } = {}) => {
        const p = new URLSearchParams();
        if (account_id) p.set('account_id', account_id);
        if (from) p.set('from', from);
        if (to)   p.set('to', to);
        return `/accounting/cashbook?${p.toString()}`;
      },
      providesTags: ['Accounting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetJournalQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useGetTrialBalanceQuery,
  useGetProfitLossQuery,
  useGetCashbookQuery,
  useGetBalanceSheetQuery,
  useGetLedgerQuery,
  useGetExpensesQuery,
  useGetOpeningBalanceQuery,
  useSaveOpeningBalanceMutation,
} = accountingApi;
