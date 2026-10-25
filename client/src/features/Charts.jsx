import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Panel } from '../components/ui';
import { label } from '../utils/format';
const colors = ['#93a1b6', '#4b67e8', '#4493d1', '#d99b36', '#39a67b'];
export default function Charts({
  data
}) {
  return <div className="chart-grid"><Panel title="Work by stage" description="Count of visible tasks in each workflow stage"><div className="chart" role="img" aria-label={data.tasksByStatus.map(x => `${label(x.name)}: ${x.value}`).join(', ')}><ResponsiveContainer><BarChart data={data.tasksByStatus.map(x => ({
            ...x,
            name: label(x.name)
          }))} margin={{
            left: 0,
            right: 12,
            bottom: 12
          }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{
              fontSize: 11
            }} interval={0} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>{data.tasksByStatus.map((x, i) => <Cell key={x.name} fill={colors[i]} />)}</Bar></BarChart></ResponsiveContainer></div></Panel><Panel title="Weekly completion" description="Visible work completed across the last 8 weeks"><div className="chart" role="img" aria-label={data.timeline.map(x => `${x.week}: ${x.completed} completed`).join(', ')}><ResponsiveContainer><LineChart data={data.timeline} margin={{
            left: 0,
            right: 20,
            bottom: 12
          }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" tick={{
              fontSize: 11
            }} /><YAxis allowDecimals={false} width={35} /><Tooltip /><Line type="monotone" dataKey="completed" stroke="#4b67e8" strokeWidth={3} dot={{
              r: 3
            }} name="Completed tasks" /></LineChart></ResponsiveContainer></div></Panel><Panel title="Priority distribution" description="How work is distributed by urgency"><div className="chart" role="img" aria-label={data.tasksByPriority.map(x => `${label(x.name)}: ${x.value}`).join(', ')}><ResponsiveContainer><PieChart><Pie data={data.tasksByPriority.map(x => ({
              ...x,
              name: label(x.name)
            }))} dataKey="value" innerRadius={65} outerRadius={95} paddingAngle={2}>{data.tasksByPriority.map((x, i) => <Cell key={x.name} fill={['#93a1b6', '#4b67e8', '#d99b36', '#d65d65'][i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Panel><Panel title="Data behind the charts"><div className="table-wrap"><table><thead><tr><th>Workflow stage</th><th>Tasks</th></tr></thead><tbody>{data.tasksByStatus.map(x => <tr key={x.name}><td>{label(x.name)}</td><td>{x.value}</td></tr>)}</tbody></table></div></Panel></div>;
}
