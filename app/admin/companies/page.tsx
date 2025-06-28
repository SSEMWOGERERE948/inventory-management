'use client'

import { useEffect, useState } from 'react'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { 
  Building2, 
  Plus, 
  Users, 
  Package,
  ShoppingCart,
  Edit,
  Trash2
} from 'lucide-react'

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
  }>
  _count: {
    products: number
    orderRequests: number
  }
  createdAt: string
}

export default function AdminCompaniesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    directorName: '',
    directorEmail: '',
    directorPassword: ''
  })

  const mockUser = {
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'ADMIN'
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      } else {
        toast.error('Failed to fetch companies')
      }
    } catch (error) {
      toast.error('Error fetching companies')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Company created successfully')
        setIsCreateDialogOpen(false)
        setFormData({
          companyName: '',
          companyEmail: '',
          companyPhone: '',
          companyAddress: '',
          directorName: '',
          directorEmail: '',
          directorPassword: ''
        })
        fetchCompanies()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create company')
      }
    } catch (error) {
      toast.error('Error creating company')
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Company deleted successfully')
        fetchCompanies()
      } else {
        toast.error('Failed to delete company')
      }
    } catch (error) {
      toast.error('Error deleting company')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="ADMIN" />
      <MobileSidebar 
        userRole="ADMIN" 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={mockUser} 
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Companies</h1>
                <p className="text-muted-foreground">Manage companies and their directors</p>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Company</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={formData.companyEmail}
                        onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Phone</Label>
                      <Input
                        id="companyPhone"
                        value={formData.companyPhone}
                        onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">Address</Label>
                      <Input
                        id="companyAddress"
                        value={formData.companyAddress}
                        onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                      />
                    </div>
                    
                    <hr />
                    
                    <div className="space-y-2">
                      <Label htmlFor="directorName">Director Name</Label>
                      <Input
                        id="directorName"
                        value={formData.directorName}
                        onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="directorEmail">Director Email</Label>
                      <Input
                        id="directorEmail"
                        type="email"
                        value={formData.directorEmail}
                        onChange={(e) => setFormData({ ...formData, directorEmail: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="directorPassword">Director Password</Label>
                      <Input
                        id="directorPassword"
                        type="password"
                        value={formData.directorPassword}
                        onChange={(e) => setFormData({ ...formData, directorPassword: e.target.value })}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Create Company
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No companies found. Create your first company to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Director</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => {
                          const director = company.users.find(user => user.role === 'COMPANY_DIRECTOR')
                          return (
                            <TableRow key={company.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{company.name}</div>
                                  <div className="text-sm text-muted-foreground">{company.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {director ? (
                                  <div>
                                    <div className="font-medium">{director.name}</div>
                                    <div className="text-sm text-muted-foreground">{director.email}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No director</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="gap-1">
                                  <Users className="h-3 w-3" />
                                  {company.users.filter(u => u.role === 'USER').length}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="gap-1">
                                  <Package className="h-3 w-3" />
                                  {company._count.products}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  {company._count.orderRequests}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCompany(company.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}