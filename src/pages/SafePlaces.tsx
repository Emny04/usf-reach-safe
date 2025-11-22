import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, MapPin, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const safePlaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().min(1, 'Address is required').max(255),
});

interface SafePlace {
  id: string;
  name: string;
  address: string;
  is_usf_recommended: boolean;
  user_id?: string;
}

export default function SafePlaces() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [places, setPlaces] = useState<SafePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<SafePlace | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchPlaces();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('usf_campus_mode')
        .eq('id', user?.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('safe_places')
        .select('*')
        .or(`user_id.eq.${user?.id},is_usf_recommended.eq.true`)
        .order('is_usf_recommended', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load safe places');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setEditingPlace(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = safePlaceSchema.safeParse({ name, address });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      const placeData = {
        name: name.trim(),
        address: address.trim(),
        user_id: user?.id,
        is_usf_recommended: false,
      };

      if (editingPlace) {
        const { error } = await supabase
          .from('safe_places')
          .update(placeData)
          .eq('id', editingPlace.id);

        if (error) throw error;
        toast.success('Place updated successfully');
      } else {
        const { error } = await supabase
          .from('safe_places')
          .insert(placeData);

        if (error) throw error;
        toast.success('Safe place added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPlaces();
    } catch (error: any) {
      console.error('Error saving place:', error);
      toast.error('Failed to save place');
    }
  };

  const handleEdit = (place: SafePlace) => {
    if (place.is_usf_recommended) {
      toast.error('Cannot edit USF recommended places');
      return;
    }
    setEditingPlace(place);
    setName(place.name);
    setAddress(place.address);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, isRecommended: boolean) => {
    if (isRecommended) {
      toast.error('Cannot delete USF recommended places');
      return;
    }

    if (!confirm('Are you sure you want to delete this place?')) return;

    try {
      const { error } = await supabase
        .from('safe_places')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Place deleted');
      fetchPlaces();
    } catch (error) {
      console.error('Error deleting place:', error);
      toast.error('Failed to delete place');
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading...</div>;
  }

  const usfPlaces = places.filter(p => p.is_usf_recommended);
  const userPlaces = places.filter(p => !p.is_usf_recommended);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Safe Places</h1>
          <p className="text-muted-foreground">Locations where you feel safe</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Place
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlace ? 'Edit Place' : 'Add Safe Place'}</DialogTitle>
              <DialogDescription>
                Add a location where you feel safe
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Place Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Home, Dorm, Library..."
                  required
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Tampa, FL 33620"
                  required
                  maxLength={255}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingPlace ? 'Update Place' : 'Add Place'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {profile?.usf_campus_mode && usfPlaces.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">USF Campus Locations</h2>
          </div>
          <div className="grid gap-4">
            {usfPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{place.name}</h3>
                      </div>
                      <p className="ml-6 text-sm text-muted-foreground">{place.address}</p>
                      <Badge variant="secondary" className="ml-6 mt-2">
                        USF Recommended
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Safe Places</h2>
        {userPlaces.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No places added yet</CardTitle>
              <CardDescription>Add your first safe place to get started</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {userPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{place.name}</h3>
                      </div>
                      <p className="ml-6 text-sm text-muted-foreground">{place.address}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(place)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(place.id, place.is_usf_recommended)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
