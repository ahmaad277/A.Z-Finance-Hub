import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogIn, Loader2, UserPlus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  const { toast } = useToast();
  const [selectedEmail, setSelectedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Fetch all active users for selection (public endpoint)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/v2/auth/users-list'],
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      return await apiRequest('POST', '/api/v2/auth/register', data);
    },
    onSuccess: () => {
      toast({
        title: language === "ar" ? "تم التسجيل بنجاح" : "Registration Successful",
        description: language === "ar" ? "يمكنك الآن تسجيل الدخول" : "You can now log in",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/auth/users-list'] });
      setShowRegister(false);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "فشل التسجيل" : "Registration Failed",
        description: error.message || (language === "ar" ? "حدث خطأ أثناء التسجيل" : "An error occurred during registration"),
        variant: "destructive",
      });
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmail || !password) {
      return;
    }

    loginMutation.mutate({
      email: selectedEmail,
      password,
      rememberMe,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      name: regName,
      email: regEmail,
      password: regPassword,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">AZ</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
            {language === "ar" ? "تسجيل الدخول" : "Login"}
          </CardTitle>
          <CardDescription data-testid="text-login-subtitle">
            {language === "ar" ? "مركز أ.ز المالي - رؤية 2040" : "A.Z Finance Hub - Vision 2040"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select" data-testid="label-user">
                {language === "ar" ? "اختر المستخدم" : "Select User"}
              </Label>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-users" />
                </div>
              ) : (
                <Select
                  value={selectedEmail}
                  onValueChange={setSelectedEmail}
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  <SelectTrigger id="user-select" data-testid="select-user">
                    <SelectValue 
                      placeholder={language === "ar" ? "اختر حسابك" : "Choose your account"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(u => u.isActive).map((u) => (
                      <SelectItem 
                        key={u.id} 
                        value={u.email}
                        data-testid={`option-user-${u.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" data-testid="label-password">
                {language === "ar" ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                disabled={loginMutation.isPending}
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>

            <div className="flex items-center space-x-2" dir="ltr">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                data-testid="checkbox-remember"
              />
              <Label 
                htmlFor="remember" 
                className="text-sm cursor-pointer"
                dir={isRTL ? "rtl" : "ltr"}
              >
                {language === "ar" ? "تذكرني (30 يوم)" : "Remember me (30 days)"}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!selectedEmail || !password || loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {language === "ar" ? "جاري تسجيل الدخول..." : "Logging in..."}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {language === "ar" ? "تسجيل الدخول" : "Login"}
                </>
              )}
            </Button>
          </form>

          {loginMutation.isError && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm text-center">
              {loginMutation.error?.message || (language === "ar" ? "فشل تسجيل الدخول" : "Login failed")}
            </div>
          )}

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => setShowRegister(true)}
              data-testid="button-show-register"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {language === "ar" ? "إنشاء حساب جديد" : "Create New Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle data-testid="text-register-title">
              {language === "ar" ? "إنشاء حساب جديد" : "Create New Account"}
            </DialogTitle>
            <DialogDescription data-testid="text-register-description">
              {language === "ar" ? "املأ المعلومات أدناه لإنشاء حسابك" : "Fill in the information below to create your account"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">{language === "ar" ? "الاسم الكامل" : "Full Name"}</Label>
              <Input
                id="reg-name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder={language === "ar" ? "أدخل اسمك الكامل" : "Enter your full name"}
                required
                data-testid="input-reg-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                id="reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder={language === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                required
                data-testid="input-reg-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">{language === "ar" ? "كلمة المرور" : "Password"}</Label>
              <Input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                required
                minLength={6}
                data-testid="input-reg-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm-password">{language === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
              <Input
                id="reg-confirm-password"
                type="password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder={language === "ar" ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                required
                minLength={6}
                data-testid="input-reg-confirm-password"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegister(false)}
                className="flex-1"
                data-testid="button-cancel-register"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="flex-1"
                data-testid="button-submit-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {language === "ar" ? "جاري التسجيل..." : "Registering..."}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {language === "ar" ? "تسجيل" : "Register"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
