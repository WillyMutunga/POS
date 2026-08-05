import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserPlus, Shield, Key, EyeOff, Save } from 'lucide-react';

export default function UserManagementModule({ onAddLog }) {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Create/Edit user fields
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('cashier');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res);
    } catch (err) {
      console.error(err);
    }
  };

  const openModalForNew = () => {
    setEditingId(null);
    setName('');
    setPin('');
    setRole('cashier');
    setIsModalOpen(true);
  };

  const openModalForEdit = (u) => {
    setEditingId(u.id);
    setName(u.name);
    setPin(u.pin);
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.deleteUser(id);
      onAddLog('USER_DELETE', `Deleted store user profile: ${name}`);
      loadUsers();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !pin) return;

    try {
      if (editingId) {
        await api.updateUser(editingId, { name, pin, role });
        onAddLog('USER_UPDATE', `Updated store user profile: ${name} (Role: ${role})`);
      } else {
        await api.createUser({ name, pin, role });
        onAddLog('USER_CREATE', `Created store user profile: ${name} (Role: ${role})`);
      }
      setIsModalOpen(false);
      setName('');
      setPin('');
      setRole('cashier');
      loadUsers();
    } catch (err) {
      alert(`User save failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="cyber-title" style={{ fontSize: '1.25rem' }}>User & Permissions Matrix</h2>
          <p className="cyber-subtitle">Set Cashier/Manager access PIN codes and security groups.</p>
        </div>

        <button className="cyber-button btn-lime" onClick={openModalForNew}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* User List */}
        <div className="cyber-card">
          <h3 className="cyber-title" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Registered Cashiers & Managers</h3>
          
          <div className="cyber-table-container">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th style={{ textAlign: 'center' }}>Role Security</th>
                  <th style={{ textAlign: 'center' }}>Authorization PIN</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cyber-badge ${u.role === 'admin' ? 'badge-orange' : u.role === 'manager' ? 'badge-cyan' : 'badge-lime'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                        <EyeOff size={12} /> {u.pin}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button className="cyber-button" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => openModalForEdit(u)}>
                          Edit
                        </button>
                        <button className="cyber-button btn-orange" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleDelete(u.id, u.name)}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access Matrix Dashboard */}
        <div className="cyber-card">
          <h3 className="cyber-title" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Permission Matrix (RBAC)</h3>
          
          <div className="cyber-table-container">
            <table className="cyber-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Terminal Module</th>
                  <th style={{ textAlign: 'center' }}>Admin</th>
                  <th style={{ textAlign: 'center' }}>Manager</th>
                  <th style={{ textAlign: 'center' }}>Cashier</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>POS Cashier Terminal</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                </tr>
                <tr>
                  <td>Inventory Management</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                </tr>
                <tr>
                  <td>Purchases & PO Placement</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                </tr>
                <tr>
                  <td>Returns / Refunds Process</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                </tr>
                <tr>
                  <td>Reports & Financial P&L</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                </tr>
                <tr>
                  <td>Staff Settings & PINs</td>
                  <td style={{ textAlign: 'center', color: 'var(--success-lime)' }}>✔</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                  <td style={{ textAlign: 'center', color: 'var(--alert-orange)' }}>✖</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add User Dialog */}
      {isModalOpen && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal" style={{ maxWidth: '400px' }}>
            <h3 className="cyber-title" style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit' : 'Add'} User Profile</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="cyber-label">Staff Name</label>
                <input 
                  type="text" 
                  className="cyber-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="cyber-label">Authorization PIN (Numeric)</label>
                <input 
                  type="password" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength="8"
                  className="cyber-input cyber-input-mono"
                  required
                  placeholder="e.g. 1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>

              <div>
                <label className="cyber-label">Security Role Group</label>
                <select 
                  className="cyber-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="cyber-button btn-orange"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="cyber-button btn-lime"
                >
                  <Save size={14} /> {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
