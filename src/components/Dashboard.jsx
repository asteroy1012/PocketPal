import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch expenses from the backend when the component loads
  useEffect(() => {
    const fetchExpenses = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await axios.get('http://localhost:3001/api/expenses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setExpenses(response.data);
      } catch (err) {
        console.error("Failed to fetch expenses", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  // Process data for the pie chart
  const categoryData = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized';
    const amount = parseFloat(expense.total_amount);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  const pieChartData = Object.keys(categoryData).map(key => ({
    name: key,
    value: categoryData[key],
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  if (isLoading) return <p>Loading dashboard...</p>;

  return (
    <div className="view-container">
      <h2>Personal Dashboard</h2>
      {expenses.length === 0 ? (
        <p>You have no expenses yet. Go to "Add Expense" to upload your first bill!</p>
      ) : (
        <div className="dashboard-content">
          <div className="chart-container">
            <h3>Spending by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="transactions-list">
            <h3>All Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td>{expense.vendor}</td>
                    <td>{expense.category}</td>
                    <td>${parseFloat(expense.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;