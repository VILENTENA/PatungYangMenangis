<script>
    lucide.createIcons();

    function startAR(lang) {
        // Menyimpan pilihan bahasa pengguna
        localStorage.setItem('selectedLang', lang);

        let targetUrl = "";

        // Menentukan laluan folder berdasarkan pilihan bahasa
        if (lang === 'ms') {
            targetUrl = "coding/Bahasa Malaysia/index.html"; // Folder Bahasa Malaysia
        } else if (lang === 'en') {
            targetUrl = "coding/English/index.html"; // Folder English
        } else if (lang === 'dus') {
            targetUrl = "coding/Bahasa Kadazandusun/index.html"; // Folder Kadazandusun
        }

        console.log("Menghala ke: " + targetUrl);
        
        // Membuka pengalaman AR
        if (targetUrl !== "") {
            window.location.href = targetUrl;
        } else {
            alert("Folder tidak ditemui!");
        }
    }
</script>