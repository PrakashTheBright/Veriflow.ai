import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Zap, Shield, BarChart3, Play, ChevronRight, 
  Bot, Cpu, Globe, ArrowRight, CheckCircle2, Sparkles 
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Testing',
    description: 'Autonomous test execution with intelligent element detection and self-healing capabilities.',
    color: 'from-neon-blue to-neon-cyan',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Execute hundreds of tests in parallel with background processing for maximum efficiency.',
    color: 'from-neon-purple to-neon-pink',
  },
  {
    icon: Shield,
    title: 'Enterprise Grade',
    description: 'Secure, scalable, and production-ready with comprehensive audit trails.',
    color: 'from-neon-green to-neon-cyan',
  },
  {
    icon: BarChart3,
    title: 'Rich Reports',
    description: 'Detailed HTML reports with screenshots, logs, and pass/fail analytics.',
    color: 'from-neon-pink to-neon-purple',
  },
]

const testTypes = [
  { name: 'UI Testing', desc: 'Automated browser testing', icon: Globe },
  { name: 'API Testing', desc: 'REST API validation', icon: Cpu },
  { name: 'E2E Flows', desc: 'Complete workflow testing', icon: Play },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neon-blue/10 via-dark-950 to-dark-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-neon-cyan/5 to-transparent rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">VeriFlow AI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link
              to="/login"
              className="px-5 py-2 text-dark-200 hover:text-white transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-primary flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border border-neon-blue/30"
            >
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-sm text-dark-200">Now with AI-Powered Self-Healing Tests</span>
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Autonomous </span>
              <span className="gradient-text">UI & API Testing</span>
              <br />
              <span className="text-white">Powered by </span>
              <span className="gradient-text">AI</span>
            </h1>

            <p className="text-xl text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              VeriFlow AI revolutionizes quality assurance with intelligent test execution,
              real-time monitoring, and comprehensive reporting—all running seamlessly in the background.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Start Testing Free
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                Sign In to Dashboard
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-12 mt-16"
            >
              {[
                { value: '10K+', label: 'Tests Executed' },
                { value: '99.9%', label: 'Uptime' },
                { value: '50ms', label: 'Avg Response' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-dark-400 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent z-10" />
            <div className="glass-card p-4 rounded-3xl neon-border max-w-5xl mx-auto">
              <div className="bg-dark-900 rounded-2xl p-6 min-h-[400px] relative overflow-hidden">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {testTypes.map((type, i) => (
                    <motion.div
                      key={type.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="glass p-4 rounded-xl"
                    >
                      <type.icon className="w-8 h-8 text-neon-blue mb-3" />
                      <h3 className="font-semibold text-white">{type.name}</h3>
                      <p className="text-dark-400 text-sm">{type.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Animated Progress Bars */}
                <div className="mt-6 space-y-3">
                  {['Create Assessment', 'Send Invite Email', 'Extend Interview Expiry'].map((test, i) => (
                    <motion.div
                      key={test}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + i * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-lg bg-dark-800/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-neon-green" />
                      <span className="flex-1 text-white">{test}</span>
                      <span className="text-neon-green text-sm font-medium">Passed</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-24 bg-gradient-to-b from-transparent via-dark-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose <span className="gradient-text">VeriFlow AI</span>?
            </h2>
            <p className="text-dark-300 text-lg max-w-2xl mx-auto">
              Built for modern teams who demand reliability, speed, and intelligence
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 card-hover group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 rounded-3xl neon-border text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Testing?
            </h2>
            <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of teams using VeriFlow AI to ship faster with confidence.
            </p>
            <Link to="/signup" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
              Get Started Today <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-dark-400">© 2026 VeriFlow AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-dark-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
