import { motion } from 'framer-motion';
import { currentUser } from '@/data/mockData';
import { Settings, Bell, Shield, LogOut } from 'lucide-react';

export default function Profile() {
  const menuItems = [
    { icon: Bell, label: 'Notifications', desc: 'Push reminders & alerts' },
    { icon: Settings, label: 'Preferences', desc: 'Display, language, theme' },
    { icon: Shield, label: 'Privacy', desc: 'Data & permissions' },
  ];

  return (
    <div className="min-h-screen pb-20 px-2 sm:px-4">
      <header className="pt-6 pb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 mb-6"
      >
        <div className="w-14 h-14 rounded-full gradient-neon flex items-center justify-center">
          <span className="text-lg font-display font-bold text-primary-foreground">{currentUser.avatar}</span>
        </div>
        <div>
          <p className="text-lg font-display font-bold text-foreground">{currentUser.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{currentUser.role}</p>
        </div>
      </motion.div>

      <div className="space-y-2 mb-6">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
          >
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );
}
