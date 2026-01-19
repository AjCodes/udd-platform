const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from both root and app dir
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'apps/operator-dashboard/.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase with:');
console.log('URL:', url);
console.log('Key length:', key?.length);
console.log('Key starts with eyJ:', key?.startsWith('eyJ'));

if (!url || !key) {
    console.error('Missing URL or Key!');
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    console.log('\n--- Testing Count ---');
    const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error('Count Error:', countError);
    else console.log('Count:', count);

    console.log('\n--- Testing Select ---');
    const { data, error: selectError } = await supabase
        .from('deliveries')
        .select('*');

    if (selectError) console.error('Select Error:', selectError);
    else console.log('Rows fetched:', data.length);

    if (data && data.length > 0) {
        console.log('First row status:', data[0].status);
    }
}

test();
