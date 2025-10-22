import json
import matplotlib.pyplot as plt
from pathlib import Path
import os

class SimpleChartGenerator:
    def __init__(self):
        self.results_dir = Path('results')
        self.reports_dir = Path('reports')
        self.reports_dir.mkdir(exist_ok=True)
        
        # Set style
        plt.style.use('default')
        
    def load_latest_results(self):
        """Load the most recent test results"""
        results = {}
        
        # Find latest PostgreSQL results
        pg_files = list(self.results_dir.glob('postgres-benchmark-*.json'))
        if pg_files:
            latest_pg = max(pg_files, key=os.path.getctime)
            with open(latest_pg) as f:
                results['postgres'] = json.load(f)
                
        # Find latest overhead results
        overhead_files = list(self.results_dir.glob('connection-overhead-*.json'))
        if overhead_files:
            latest_overhead = max(overhead_files, key=os.path.getctime)
            with open(latest_overhead) as f:
                results['overhead'] = json.load(f)
                
        return results
    
    def create_throughput_comparison(self, postgres_data):
        """Create throughput comparison chart"""
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Extract data
        without_pooling = postgres_data['withoutPooling']
        with_pooling = postgres_data['withPooling']
        
        users_without = [r['concurrentUsers'] for r in without_pooling]
        throughput_without = [r['requests']['average'] for r in without_pooling]
        
        users_with = [r['concurrentUsers'] for r in with_pooling]
        throughput_with = [r['requests']['average'] for r in with_pooling]
        
        # Create the plot
        ax.plot(users_without, throughput_without, 'o-', linewidth=3, markersize=8, 
                label='Without Connection Pooling', color='#e74c3c')
        ax.plot(users_with, throughput_with, 'o-', linewidth=3, markersize=8, 
                label='With Connection Pooling', color='#2ecc71')
        
        ax.set_xlabel('Concurrent Users', fontsize=14, fontweight='bold')
        ax.set_ylabel('Requests per Second', fontsize=14, fontweight='bold')
        ax.set_title('PostgreSQL Throughput: Connection Pooling vs Direct Connections', 
                    fontsize=16, fontweight='bold', pad=20)
        
        ax.legend(fontsize=12)
        ax.grid(True, alpha=0.3)
        
        # Add improvement annotations for matching user counts
        for user_count in users_with:
            without_result = next((r for r in without_pooling if r['concurrentUsers'] == user_count), None)
            with_result = next((r for r in with_pooling if r['concurrentUsers'] == user_count), None)
            
            if without_result and with_result and without_result['requests']['average'] > 0:
                improvement = ((with_result['requests']['average'] - without_result['requests']['average']) / 
                             without_result['requests']['average']) * 100
                if improvement > 10:  # Only show significant improvements
                    ax.annotate(f'+{improvement:.0f}%', 
                              xy=(user_count, with_result['requests']['average']), 
                              xytext=(10, 10), 
                              textcoords='offset points',
                              fontsize=10, 
                              fontweight='bold',
                              color='#27ae60')
        
        plt.tight_layout()
        plt.savefig(self.reports_dir / 'throughput_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("📊 Generated: throughput_comparison.png")
    
    def create_latency_comparison(self, postgres_data):
        """Create latency comparison chart"""
        fig, ax = plt.subplots(figsize=(12, 8))
        
        without_pooling = postgres_data['withoutPooling']
        with_pooling = postgres_data['withPooling']
        
        users_without = [r['concurrentUsers'] for r in without_pooling]
        latency_without = [r['latency']['p99'] for r in without_pooling]
        
        users_with = [r['concurrentUsers'] for r in with_pooling]
        latency_with = [r['latency']['p99'] for r in with_pooling]
        
        ax.plot(users_without, latency_without, 'o-', linewidth=3, markersize=8, 
                label='Without Connection Pooling', color='#e74c3c')
        ax.plot(users_with, latency_with, 'o-', linewidth=3, markersize=8, 
                label='With Connection Pooling', color='#2ecc71')
        
        ax.set_xlabel('Concurrent Users', fontsize=14, fontweight='bold')
        ax.set_ylabel('P99 Latency (ms)', fontsize=14, fontweight='bold')
        ax.set_title('PostgreSQL Latency: Connection Pooling vs Direct Connections', 
                    fontsize=16, fontweight='bold', pad=20)
        
        ax.legend(fontsize=12)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(self.reports_dir / 'latency_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("📊 Generated: latency_comparison.png")
    
    def create_connection_overhead_chart(self, overhead_data):
        """Create connection overhead comparison"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # PostgreSQL overhead
        pg_analysis = overhead_data['analysis']['postgres']
        categories = ['Direct\nConnections', 'Pooled\nConnections']
        times = [pg_analysis['direct']['average'], pg_analysis['pooled']['average']]
        
        bars = ax.bar(categories, times, color=['#e74c3c', '#2ecc71'], alpha=0.8, width=0.6)
        ax.set_ylabel('Average Connection Time (ms)', fontsize=12, fontweight='bold')
        ax.set_title('PostgreSQL Connection Overhead Comparison', fontsize=14, fontweight='bold')
        
        # Add value labels on bars
        for bar, value in zip(bars, times):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(times) * 0.01,
                    f'{value:.1f}ms', ha='center', va='bottom', fontweight='bold', fontsize=12)
        
        # Add improvement text
        improvement = ((times[0] - times[1]) / times[0]) * 100
        ax.text(0.5, max(times) * 0.8, f'{improvement:.1f}% Faster\nwith Pooling', 
                ha='center', va='center', fontsize=14, fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.3", facecolor='lightgreen', alpha=0.7))
        
        plt.tight_layout()
        plt.savefig(self.reports_dir / 'connection_overhead.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("📊 Generated: connection_overhead.png")
    
    def create_performance_summary(self, postgres_data):
        """Create a comprehensive performance summary chart"""
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        
        without_pooling = postgres_data['withoutPooling']
        with_pooling = postgres_data['withPooling']
        
        # Get common user counts
        common_users = []
        throughput_without = []
        throughput_with = []
        latency_without = []
        latency_with = []
        
        for with_result in with_pooling:
            user_count = with_result['concurrentUsers']
            without_result = next((r for r in without_pooling if r['concurrentUsers'] == user_count), None)
            
            if without_result:
                common_users.append(user_count)
                throughput_without.append(without_result['requests']['average'])
                throughput_with.append(with_result['requests']['average'])
                latency_without.append(without_result['latency']['p99'])
                latency_with.append(with_result['latency']['p99'])
        
        # 1. Throughput comparison
        x_pos = range(len(common_users))
        width = 0.35
        
        ax1.bar([x - width/2 for x in x_pos], throughput_without, width, 
                label='Without Pooling', color='#e74c3c', alpha=0.7)
        ax1.bar([x + width/2 for x in x_pos], throughput_with, width, 
                label='With Pooling', color='#2ecc71', alpha=0.7)
        ax1.set_ylabel('Requests/sec')
        ax1.set_title('Throughput Comparison')
        ax1.set_xticks(x_pos)
        ax1.set_xticklabels([f'{u}' for u in common_users])
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 2. Latency comparison
        ax2.bar([x - width/2 for x in x_pos], latency_without, width, 
                label='Without Pooling', color='#e74c3c', alpha=0.7)
        ax2.bar([x + width/2 for x in x_pos], latency_with, width, 
                label='With Pooling', color='#2ecc71', alpha=0.7)
        ax2.set_ylabel('P99 Latency (ms)')
        ax2.set_title('Latency Comparison')
        ax2.set_xticks(x_pos)
        ax2.set_xticklabels([f'{u}' for u in common_users])
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # 3. Performance improvements
        improvements = []
        for i in range(len(common_users)):
            if throughput_without[i] > 0:
                improvement = ((throughput_with[i] - throughput_without[i]) / throughput_without[i]) * 100
                improvements.append(improvement)
            else:
                improvements.append(0)
        
        bars = ax3.bar(x_pos, improvements, color='#f39c12', alpha=0.8)
        ax3.set_ylabel('Improvement (%)')
        ax3.set_title('Throughput Improvement with Pooling')
        ax3.set_xticks(x_pos)
        ax3.set_xticklabels([f'{u}' for u in common_users])
        ax3.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        ax3.grid(True, alpha=0.3)
        
        # Add percentage labels
        for i, (bar, improvement) in enumerate(zip(bars, improvements)):
            if improvement > 0:
                ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(improvements) * 0.02,
                        f'+{improvement:.0f}%', ha='center', va='bottom', fontweight='bold')
        
        # 4. Summary statistics
        ax4.axis('off')
        
        # Calculate summary stats
        avg_throughput_improvement = sum(improvements) / len(improvements) if improvements else 0
        max_throughput_improvement = max(improvements) if improvements else 0
        
        avg_latency_reduction = 0
        if latency_without and latency_with:
            latency_improvements = []
            for i in range(len(latency_without)):
                if latency_without[i] > 0:
                    reduction = ((latency_without[i] - latency_with[i]) / latency_without[i]) * 100
                    latency_improvements.append(reduction)
            avg_latency_reduction = sum(latency_improvements) / len(latency_improvements) if latency_improvements else 0
        
        summary_text = f"""
        📊 PERFORMANCE SUMMARY
        
        🚀 Throughput Improvements:
        • Average: +{avg_throughput_improvement:.0f}%
        • Maximum: +{max_throughput_improvement:.0f}%
        
        ⚡ Latency Improvements:
        • Average P99 reduction: {avg_latency_reduction:.0f}%
        
        🎯 Key Benefits:
        • Handles higher concurrent loads
        • Consistent performance under stress
        • Eliminates connection timeouts
        • Dramatic resource savings
        """
        
        ax4.text(0.1, 0.9, summary_text, transform=ax4.transAxes, fontsize=12,
                verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle="round,pad=0.5", facecolor='lightblue', alpha=0.7))
        
        plt.suptitle('Connection Pooling Performance Analysis', fontsize=18, fontweight='bold', y=0.98)
        plt.tight_layout()
        plt.savefig(self.reports_dir / 'performance_summary.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("📊 Generated: performance_summary.png")
    
    def generate_all_charts(self):
        """Generate all performance charts"""
        print("🎨 Generating performance charts...")
        
        results = self.load_latest_results()
        
        if 'postgres' in results:
            print("📊 Creating PostgreSQL performance charts...")
            self.create_throughput_comparison(results['postgres'])
            self.create_latency_comparison(results['postgres'])
            self.create_performance_summary(results['postgres'])
        
        if 'overhead' in results:
            print("📊 Creating connection overhead charts...")
            self.create_connection_overhead_chart(results['overhead'])
        
        print(f"\n✅ All charts generated in {self.reports_dir}/")
        print("📁 Generated files:")
        for chart_file in self.reports_dir.glob('*.png'):
            print(f"   - {chart_file.name}")

if __name__ == "__main__":
    generator = SimpleChartGenerator()
    generator.generate_all_charts()