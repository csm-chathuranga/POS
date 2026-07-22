import { api } from '../../app/baseApi';

export const reportsApi = api.injectEndpoints({
  endpoints: b => ({
    getReportToday:           b.query({ query: () => '/reports/today' }),
    getReportDayEnd:          b.query({ query: date => `/reports/day-end?date=${date}` }),
    getReportMonthly:         b.query({ query: month => `/reports/monthly?month=${month}` }),
    getReportTopProducts:     b.query({ query: () => '/reports/top-products' }),
    getReportLowStock:        b.query({ query: () => '/reports/low-stock' }),
    getReportProfit:          b.query({ query: p => `/reports/profit?date_from=${p.from}&date_to=${p.to}` }),
    getReportCreditCustomers: b.query({ query: () => '/reports/credit-customers' }),
    getReportStockSummary:    b.query({ query: p => {
      const q = new URLSearchParams({ page: p.page || 1 });
      if (p.search) q.set('search', p.search);
      if (p.category_id) q.set('category_id', p.category_id);
      return `/reports/stock-summary?${q}`;
    }}),
    getReportRevenue:         b.query({ query: p => `/reports/revenue?date_from=${p.from}&date_to=${p.to}` }),
  }),
});

export const {
  useGetReportTodayQuery,
  useGetReportDayEndQuery,
  useGetReportMonthlyQuery,
  useGetReportTopProductsQuery,
  useGetReportLowStockQuery,
  useGetReportProfitQuery,
  useGetReportCreditCustomersQuery,
  useGetReportStockSummaryQuery,
  useGetReportRevenueQuery,
} = reportsApi;
