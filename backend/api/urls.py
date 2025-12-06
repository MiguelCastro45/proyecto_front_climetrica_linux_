from django.urls import path
from . import views

urlpatterns = [
   
    # Usuarios normales
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_own_profile, name='update_own_profile'),

    # Recuperación de contraseña
    path('check-email/', views.check_email, name='check_email'),
    path('reset-password/', views.reset_password, name='reset_password'),

    # Admin — gestión de usuarios
    path('users/', views.list_users, name='list_users'),                # GET
    path('users/<str:user_id>/', views.update_user, name='update_user'), # PUT
    path('users/delete/<str:user_id>/', views.delete_user, name='delete_user'), # DELETE

    #Listar Datasets
    path('climate-data/', views.get_climate_data, name='get_climate_data'),  # GET
    path('climate-data/save/', views.save_climate_data, name='save_climate_data'),  # POST
    path('climate-data/<str:record_id>/', views.delete_climate_data, name='delete_climate_data'),  # DELETE
]
