
import { supabase } from '@/app/lib/supabaseClient';
import React, { useState } from 'react';

interface AddSessionDialogProps {
  onApply: () => void;
  open: boolean;
  onClose: () => void;
}

const AddSessionDialog: React.FC<AddSessionDialogProps> = ({ onApply, open, onClose }) => {
  const [filterValue, setFilterValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {

      const user_id = (await supabase.auth.getSession()).data.session?.user.id;


      const { data, error } = await supabase
        .from('sessions')
        .insert([{ user_id: user_id, name: filterValue, created_at: new Date().toUTCString() }]);

      if (error) throw error;
      onApply();
      setFilterValue('');
      onClose();
    } catch (error) {
      console.error('Error adding session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4 text-white">Add Session</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="border border-gray-700 rounded-md px-3 py-2 w-full mb-4 bg-gray-800 text-white placeholder-gray-400"
            placeholder="Enter filter value"
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md mr-2 hover:bg-gray-500 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Adding...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSessionDialog;