import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';
import { fetchFormSubmissions, updateFormSubmissionStatus } from '../lib/xano';

type FormSubmission = {
  id: number;
  form_type: 'contact' | 'waitlist';
  name: string;
  email: string;
  organization: string;
  message?: string;
  website?: string;
  how_heard?: string;
  animals_count?: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  submission_date: string;
  ip_address?: string;
  admin_notes?: string;
};

export default function Communications() {
  const { orgId, loading: tenantLoading } = useTenant();
  const [filterType, setFilterType] = useState<'all' | 'contact' | 'waitlist'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['form_submissions', orgId, filterType, filterStatus],
    queryFn: () => fetchFormSubmissions({
      org_id: orgId,
      form_type: filterType === 'all' ? undefined : filterType,
      status: filterStatus === 'all' ? undefined : filterStatus,
      limit: 100,
    }),
    enabled: !!orgId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      updateFormSubmissionStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_submissions'] });
      setSelectedSubmission(null);
    },
  });

  const submissions = data?.submissions || [];

  if (tenantLoading || isLoading) {
    return <Layout><div>Loading submissions...</div></Layout>;
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'replied': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-deep-taupe">📧 Communications Inbox</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Form Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Forms</option>
                <option value="contact">Contact Forms</option>
                <option value="waitlist">Waitlist Forms</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading submissions...</div>
          ) : submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission: FormSubmission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                          {submission.form_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.organization}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={`mailto:${submission.email}`} className="text-warm-brown hover:underline">
                          {submission.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(submission.submission_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(submission.status)}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-warm-brown hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-4">📭</p>
              <p>No submissions yet. Forms will appear here when people contact you.</p>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-deep-taupe">Submission Details</h2>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Form Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedSubmission.form_type}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSubmission.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organization</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSubmission.organization}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">
                      <a href={`mailto:${selectedSubmission.email}`} className="text-warm-brown hover:underline">
                        {selectedSubmission.email}
                      </a>
                    </p>
                  </div>

                  {selectedSubmission.message && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Message</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedSubmission.message}</p>
                    </div>
                  )}

                  {selectedSubmission.website && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <p className="mt-1 text-sm text-gray-900">
                        <a href={selectedSubmission.website} target="_blank" rel="noopener noreferrer" className="text-warm-brown hover:underline">
                          {selectedSubmission.website}
                        </a>
                      </p>
                    </div>
                  )}

                  {selectedSubmission.how_heard && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">How They Heard About Us</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSubmission.how_heard}</p>
                    </div>
                  )}

                  {selectedSubmission.animals_count && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Animals Per Year</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSubmission.animals_count}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submission Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubmission.submission_date)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'read' })}
                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'replied' })}
                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Mark as Replied
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'archived' })}
                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <a
                    href={`mailto:${selectedSubmission.email}`}
                    className="px-4 py-2 bg-warm-brown text-white rounded hover:bg-opacity-90"
                  >
                    Reply via Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
