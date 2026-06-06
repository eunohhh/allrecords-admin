'use client';

import { Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AddShareDialog,
  CreateCatDialog,
  catColumns,
  EditCatDialog,
  EditPhotoDialog,
  galleryColumns,
  photoColumns,
  shareColumns,
  UploadPhotoDialog,
} from '@/components/cat-photos';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCats,
  useDeleteCat,
  useDeletePhoto,
  useGalleries,
  usePhotos,
  useReindex,
  useRemoveShare,
  useShares,
} from '@/hooks/cat-photos-queries';
import type { CatSummary, Photo, ShareMember } from '@/lib/apis/api-client';
import { authClient } from '@/lib/auth-client';
import { getErrorMessage } from '@/lib/errors';

export default function CatPhotosPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);

  // Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CatSummary | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [addShareOpen, setAddShareOpen] = useState(false);

  // Selection states
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [selectedCats, setSelectedCats] = useState<CatSummary[]>([]);
  const [selectedShares, setSelectedShares] = useState<ShareMember[]>([]);

  // Queries
  const { data: galleries } = useGalleries();
  const { data: photos, isLoading: photosLoading } = usePhotos(ownerId);
  const { data: cats } = useCats(ownerId);
  const { data: shares, isLoading: sharesLoading } = useShares();

  // Mutations
  const deletePhoto = useDeletePhoto(ownerId);
  const deleteCat = useDeleteCat(ownerId);
  const reindex = useReindex(ownerId);
  const removeShare = useRemoveShare();

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        router.push('/login');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [session, isPending, router]);

  // Default the gallery selector to the user's own gallery, else the first one.
  useEffect(() => {
    if (ownerId === undefined && galleries && galleries.length > 0) {
      const own = galleries.find((g) => g.isOwner) ?? galleries[0];
      setOwnerId(own.ownerId);
    }
  }, [galleries, ownerId]);

  const handlePhotoSelection = useCallback((rows: Photo[]) => setSelectedPhotos(rows), []);
  const handleCatSelection = useCallback((rows: CatSummary[]) => setSelectedCats(rows), []);
  const handleShareSelection = useCallback((rows: ShareMember[]) => setSelectedShares(rows), []);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setPhotoDialogOpen(true);
  };

  const handleCatClick = (cat: CatSummary) => {
    setSelectedCat(cat);
    setCatDialogOpen(true);
  };

  const handleDeletePhoto = async () => {
    if (selectedPhotos.length === 0) return;
    if (!confirm('이 사진을 삭제할까요?')) return;
    try {
      await deletePhoto.mutateAsync(selectedPhotos[0].id);
      toast.success('삭제되었습니다');
      setSelectedPhotos([]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteCat = async () => {
    if (selectedCats.length === 0) return;
    if (!confirm('이 고양이를 삭제할까요? 사진 태그/링크도 정리됩니다.')) return;
    try {
      await deleteCat.mutateAsync(selectedCats[0].id);
      toast.success('삭제되었습니다');
      setSelectedCats([]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReindex = async () => {
    if (!confirm('기존 사진을 재식별할까요? 처리에 시간이 걸릴 수 있습니다.')) return;
    try {
      const res = await reindex.mutateAsync();
      toast.success(`재식별 대상 ${res.armed}장을 예약했습니다`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRevokeShare = async () => {
    if (selectedShares.length === 0) return;
    if (!confirm('이 멤버의 공유를 해제할까요?')) return;
    try {
      await removeShare.mutateAsync(selectedShares[0].memberUserId);
      toast.success('공유를 해제했습니다');
      setSelectedShares([]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    localStorage.removeItem('app_access_token');
    router.push('/login');
  };

  if (isPending || !isAuthorized) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">고양이 사진첩</h1>
        <div className="flex items-center gap-4">
          <Select
            value={ownerId ?? ''}
            onValueChange={(v) => setOwnerId(v)}
            disabled={!galleries || galleries.length === 0}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="사진첩 선택" />
            </SelectTrigger>
            <SelectContent>
              {galleries?.map((g) => (
                <SelectItem key={g.ownerId} value={g.ownerId}>
                  {g.ownerName}
                  {g.isOwner ? ' (내 사진첩)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>
            {session?.user?.name} ({session?.user?.role})
          </span>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="cats">Cats</TabsTrigger>
          <TabsTrigger value="galleries">Galleries</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <div className="rounded-md border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">사진/영상</h2>
                <p className="text-sm text-muted-foreground">
                  행을 클릭해 상세/수정. 처리 중 항목은 5초마다 자동 갱신됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setUploadOpen(true)} disabled={!ownerId}>
                  <Upload className="mr-2 h-4 w-4" />
                  업로드
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeletePhoto}
                  disabled={selectedPhotos.length === 0 || deletePhoto.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
            {photosLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columns={photoColumns}
                data={photos?.items ?? []}
                onRowClick={handlePhotoClick}
                onSelectionChange={handlePhotoSelection}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="cats">
          <div className="rounded-md border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">고양이</h2>
                <p className="text-sm text-muted-foreground">행을 클릭해 이름 변경</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCreateCatOpen(true)} disabled={!ownerId}>
                  <Plus className="mr-2 h-4 w-4" />
                  추가
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReindex}
                  disabled={!ownerId || reindex.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  재식별
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCat}
                  disabled={selectedCats.length === 0 || deleteCat.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
            <DataTable
              columns={catColumns}
              data={cats ?? []}
              onRowClick={handleCatClick}
              onSelectionChange={handleCatSelection}
            />
          </div>
        </TabsContent>

        <TabsContent value="galleries">
          <div className="space-y-6">
            <div className="rounded-md border p-4">
              <h2 className="mb-2 text-xl font-semibold">접근 가능한 사진첩</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                본인 + 공유받은 사진첩 (읽기 전용)
              </p>
              <DataTable columns={galleryColumns} data={galleries ?? []} />
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">공유 멤버</h2>
                  <p className="text-sm text-muted-foreground">내 사진첩의 멤버 (소유자 전용)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setAddShareOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    공유 추가
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRevokeShare}
                    disabled={selectedShares.length === 0 || removeShare.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    해제
                  </Button>
                </div>
              </div>
              {sharesLoading ? (
                <div>Loading...</div>
              ) : (
                <DataTable
                  columns={shareColumns}
                  data={shares ?? []}
                  onSelectionChange={handleShareSelection}
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <UploadPhotoDialog ownerId={ownerId} open={uploadOpen} onOpenChange={setUploadOpen} />
      <EditPhotoDialog
        photo={selectedPhoto}
        ownerId={ownerId}
        cats={cats ?? []}
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
      />
      <CreateCatDialog ownerId={ownerId} open={createCatOpen} onOpenChange={setCreateCatOpen} />
      <EditCatDialog
        cat={selectedCat}
        ownerId={ownerId}
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
      />
      <AddShareDialog open={addShareOpen} onOpenChange={setAddShareOpen} />
    </div>
  );
}
