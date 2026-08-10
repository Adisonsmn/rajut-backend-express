import { createClient } from '@supabase/supabase-js';
import { AppError } from './AppError.js';

const getSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
        throw new AppError('Supabase storage not configured', 500);
    }
    
    return createClient(url, key);
};

export const uploadFileToSupabase = async (
    file: Express.Multer.File, 
    type: string = 'upload',
    folderName?: string
): Promise<string> => {
    const supabase = getSupabaseAdmin();
    let bucket: string;

    switch (type) {
        case 'product':
            bucket = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';
            break;
        case 'custom-product':
            bucket = process.env.SUPABASE_CUSTOMPRODUCT_REQUEST_BUCKET || 'custom-product-request-images';
            break;
        case 'custom-product-response':
            bucket = process.env.SUPABASE_CUSTOMPRODUCT_RESPONSE_BUCKET || 'custom-product-response-images';
            break;
        case 'account':
            bucket = process.env.SUPABASE_ACCOUNT_PROFILE_BUCKET || 'account-profile-images';
            break;
        case 'site':
            bucket = process.env.SUPABASE_SITE_BUCKET || 'site-assets';
            break;
        default:
            bucket = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';
    }

    const ext = file.originalname.split('.').pop();
    const folderPath = folderName ? `${folderName}/` : '';
    const fileName = `${type}/${folderPath}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (uploadError) {
        throw new AppError(uploadError.message, 500);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    
    return publicUrl;
};

export const deleteFilesFromSupabase = async (urls: string[], type: string) => {
    if (!urls || urls.length === 0) return;
    const supabase = getSupabaseAdmin();
    let bucket: string;

    switch (type) {
        case 'product':
            bucket = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';
            break;
        case 'custom-product':
            bucket = process.env.SUPABASE_CUSTOMPRODUCT_REQUEST_BUCKET || 'custom-product-request-images';
            break;
        case 'custom-product-response':
            bucket = process.env.SUPABASE_CUSTOMPRODUCT_RESPONSE_BUCKET || 'custom-product-response-images';
            break;
        case 'account':
            bucket = process.env.SUPABASE_ACCOUNT_PROFILE_BUCKET || 'account-profile-images';
            break;
        case 'site':
            bucket = process.env.SUPABASE_SITE_BUCKET || 'site-assets';
            break;
        default:
            bucket = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';
    }

    const paths = urls.map(url => {
        const urlParts = url.split(`/storage/v1/object/public/${bucket}/`);
        return urlParts.length > 1 ? urlParts[1] : null;
    }).filter((path): path is string => path !== null);

    if (paths.length > 0) {
        await supabase.storage.from(bucket).remove(paths);
    }
};
