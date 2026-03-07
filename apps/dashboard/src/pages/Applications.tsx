import { useState } from 'react';
import Layout from '../components/Layout';

const ADOPTION_CODES = [
  '4.Approved',
  '1.LM',
  '7.Adopted: MBPR',
  'Approved',
  'Adopted: MBPR',
  'Z.Denied',
  '6.Conditional Approval',
  'LM',
  'Foster',
  'Denied',
  'Conditional Approval',
  'Call Later',
  '5.Approved: Adult',
  '8.Adopted: Other',
  '2.Call Later',
  '9.Foster',
  'Approved: Adult',
  'Returned',
  '3.VIP',
  'VIP',
  'Adopted: Other',
  'Volunteer',
  'Y.Returned',
];

export default function Applications() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCode, setFilterCode] = useState('');

  const handleReset = () => {
    setSearch('');
    setFilterType('');
    setFilterCode('');
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-silver-gray">
          <h2 className="text-xl font-serif font-semibold text-deep-taupe">Applications Management</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Manage adoption, foster, and relinquishment applications.
          </p>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="bg-cloud p-4 rounded-lg mb-6">
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-deep-taupe mb-2">
                🔍 Search Applications
              </label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, adoption code, or any field..."
                className="w-full border border-silver-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown focus:border-warm-brown bg-white text-deep-taupe"
              />
              <p className="text-xs text-gray-500 mt-1">Search across all fields in real-time</p>
            </div>

            {/* Filter dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-deep-taupe mb-2">
                  Application Type
                </label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full border border-silver-gray rounded-lg px-3 py-2 text-sm bg-white text-deep-taupe"
                >
                  <option value="">All Types</option>
                  <option value="adoption">Adoption Applications</option>
                  <option value="foster">Foster Applications</option>
                  <option value="relinquishment">Relinquishment Applications</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-taupe mb-2">
                  Adoption Code
                </label>
                <select
                  value={filterCode}
                  onChange={e => setFilterCode(e.target.value)}
                  className="w-full border border-silver-gray rounded-lg px-3 py-2 text-sm bg-white text-deep-taupe"
                >
                  <option value="">All Codes</option>
                  {ADOPTION_CODES.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleReset}
                  className="w-full border border-stone rounded-lg px-3 py-2 text-sm font-medium text-deep-taupe hover:bg-dove transition"
                >
                  🔄 Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="rounded-lg border border-silver-gray overflow-hidden">
            <div className="bg-gray-50 border-b border-silver-gray px-6 py-3 grid grid-cols-6 gap-4 text-xs font-semibold text-deep-taupe uppercase tracking-wide">
              <span>Applicant</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Date</span>
              <span>Code</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="text-center py-16">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-serif font-semibold text-deep-taupe mb-1">Applications Coming Soon</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Applications data will appear here once the API is connected. Use the filters above to search when data is available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
